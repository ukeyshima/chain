import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import { BlockCreator as BlockCreatorModel } from '../models';

const parser = new DOMParser();

@connect(
	(state) => ({
		blocks: state.blocks,
		links: state.pinLinks,
		html: state.htmlEditor
	})
)
export default class HTMLRenderer extends Component {
	render() {
		const { props: { html } } = this;
		const $doc = parser.parseFromString(html, 'text/html');
		const $body = $doc.querySelector('body');
		const $script = document.createElement('script');
		$script.innerHTML = this.toEvalableString();
		$body.appendChild($script);

		return <iframe srcDoc={`<!doctype html>${$doc.documentElement.outerHTML}`} style={{ display: 'block', width: '100%', height: '100%', border: 'none', backgroundColor: 'white' }} />;
	}

	toEvalableString() {
		const { props: { blocks } } = this;

		return this.toEvalableStringSub(blocks.first().get('id'));
	}

	toEvalableStringSub(id) {
		if (id === null) {
			return 'null';
		}

		const { props: { blocks } } = this;
		const block = blocks.get(id);
		const args = block.get('inputPins').map((pin) => this.toEvalableStringSub(this.findOutputBlockIdFromLinks({ input: { block: id, pin: pin.get('index') } }))).toJS();

		switch (block.get('type')) {
			case BlockCreatorModel.VIEW_BLOCK:
				return _.join(args, '\n');
			case BlockCreatorModel.CREATABLE_TYPES.VALUE_BLOCK:
				return block.get('value');
			case BlockCreatorModel.CREATABLE_TYPES.FUNCTION_BLOCK:
				const [head, ...rest] = args;
				const vals = `(${_.join(rest, ', ')})`;
				return head ? `${head}[${JSON.stringify(block.get('value'))}]${vals}` : `${block.get('value')}${vals}`;
			case BlockCreatorModel.CREATABLE_TYPES.PROPERTY_BLOCK:
				return `${args[0]}[${JSON.stringify(block.get('value'))}]`;
			case BlockCreatorModel.CREATABLE_TYPES.OPERATOR_BLCOK:
				return `${args[0]}${block.get('value')}${args[1]}`;
			default:
				return '"UNKNOWN_BLOCK"';
		}
	}

	findOutputBlockIdFromLinks(query) {
		const { props: { links } } = this;
		let block = null;

		links.some((link) => {
			if (link.match(query)) {
				block = link.get('output').block;
				return true;
			}

			return false;
		});

		return block;
	}
}