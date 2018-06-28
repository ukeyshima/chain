import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import { BLOCK } from '../constants';
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
				return args;
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
				return `"TIMER_BLOCK, ${1000 / block.get('value')}"`;
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
		const { props: { html } } = this;
		const $doc = parser.parseFromString(html, 'text/html');
		const $body = $doc.querySelector('body');
		const $script = document.createElement('script');
		const script = _.join(_.map(this.toEvalableString(), (a) => `parent.postMessage({ type: 'chain-result', value: ${a} }, '*')`), '\n');
		$script.innerHTML = `
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
