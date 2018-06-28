import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import { BLOCK } from '../constants';
import Immutable from 'immutable';
import './HTMLRenderer.scss';

const parser = new DOMParser();

@connect(
	({ blocks, pinLinks, htmlEditor }) => ({
		blocks,
		links: pinLinks,
		html: htmlEditor
	})
)
export default class HTMLRenderer extends Component {
	constructor() {
		super();

		this._vars = [];
	}

	shouldComponentUpdate(nextProps) {
		const { props: { blocks, links, html } } = this;
		const { blocks: nextBlocks, links: nextLinks, html: nextHtml } = nextProps;

		return !Immutable.is(blocks.slice(1), nextBlocks.slice(1)) || !Immutable.is(links, nextLinks) || !Immutable.is(html, nextHtml);
	}

	toEvalableString() {
		const { props: { blocks } } = this;
		const first = blocks.first();

		return first ? this.toEvalableStringSub(first.get('id')) : null;
	}

	toEvalableStringSub(id) {
		if (id === null) {
			return 'null';
		}

		const { props: { blocks } } = this;
		const block = blocks.find((a) => a.get('id') === id);
		const args = block.get('inputPins').map((pin) => this.toEvalableStringSub(this.findOutputBlockIdFromLinks({ input: { block: id, pin: pin.get('index') } }))).toJS();

		switch (block.get('type')) {
			case BLOCK.TYPE_VIEW:
				return _.map(args, (arg) => {
					const matched = arg.match(/_timer_variable_\d+_(.*?)_/);

					if (matched) {
						return `setInterval(() => {
							${arg}
							${matched[0]} += 1;
						}, 1000 / ${matched[1]})`;
					}

					return arg;
				});
			case BLOCK.TYPE_VALUE:
				return block.get('value');
			case BLOCK.TYPE_FUNCTION:
				const [head, ...rest] = args;
				const vals = `(${_.join(rest, ', ')})`;
				return head ? `${head}[${JSON.stringify(block.get('value'))}]${vals}` : `${block.get('value')}${vals}`;
			case BLOCK.TYPE_PROPERTY:
				return `${args[0]}[${JSON.stringify(block.get('value'))}]`;
			case BLOCK.TYPE_OPERATOR:
				return `(${args[0]}${block.get('value')}${args[1]})`;
			case BLOCK.TYPE_MATH:
				const { expression, args: hargs, flattenArgs } = block.get('handwriting');
				let ret = '';
				let prev = 0;

				_.forEach(hargs, ({ char, index }) => {
					ret += expression.substring(prev, index) + args[_.indexOf(flattenArgs, char)];

					prev = index + 1;
				});

				ret += expression.slice(prev);

				return `(${ret})`;
			case BLOCK.TYPE_TIMER:
				const chainVar = `_timer_variable_${Date.now()}_${block.get('value')}_`;
				this._vars.push(chainVar);
				return chainVar;
			default:
				return '"UNKNOWN_BLOCK"';
		}
	}

	findOutputBlockIdFromLinks(query) {
		const { props: { links } } = this;
		let block = null;

		links.some((link) => {
			if (link.match(query)) {
				block = link.getIn(['output', 'block']);
				return true;
			}

			return false;
		});

		return block;
	}

	render() {
		this._vars = [];

		const { props: { html }, _vars } = this;
		const $doc = parser.parseFromString(html, 'text/html');
		const $body = $doc.querySelector('body');
		const $script = document.createElement('script');
		const script = _.join(_.map(this.toEvalableString(), (a) => `parent.postMessage({ type: 'chain-result', value: ${a} }, '*')`), '\n');
		$script.innerHTML = `
			${_.join(_.map(_vars, (a) => `let ${a} = 0;`), '\n')}
			parent.postMessage({ type: 'chain-clear' }, '*');
			try {
				(0, eval)(${JSON.stringify(script)});
			} catch (err) {
				parent.postMessage({ type: 'chain-error', value: String(err) }, '*');
			}
		`;
		$body.appendChild($script);

		return <iframe srcDoc={`<!doctype html>${$doc.documentElement.outerHTML}`} styleName='base' />;
	}
}
