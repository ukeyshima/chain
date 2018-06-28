import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import _ from 'lodash';
import actions from '../actions';
import { BLOCK } from '../constants';
import { batchActions } from 'redux-batched-actions';
import autobind from 'autobind-decorator';
import './BlockCreator.scss';

const OPTION_NAME_LIST = _.map(BLOCK.CREATABLE_BLOCK_LIST, (a) => `${_.capitalize(a)} Block`);

@connect()
export default class BlockCreator extends Component {
	componentWillUpdate(nextProps) {
		const { model: nextModel } = nextProps;
		const { props: { model } } = this;

		if (!model.get('visible') && nextModel.get('visible')) {
			document.addEventListener('mousedown', this.onMouseDownOrTouchStartDocument);
			document.addEventListener('touchstart', this.onMouseDownOrTouchStartDocument);
		}
	}

	@autobind
	onClick() {
		const { props: { model, dispatch } } = this;

		document.removeEventListener('mousedown', this.onMouseDownOrTouchStartDocument);
		document.removeEventListener('touchstart', this.onMouseDownOrTouchStartDocument);
		dispatch(batchActions([
			actions.addBlock({ x: model.get('x'), y: model.get('y'), type: model.get('selected') }),
			actions.updateBlockCreator({ visible: false })
		]));
	}

	/**
	 * @param {Event} e
	 */
	@autobind
	onChangeSelect(e) {
		const { currentTarget: { value } } = e;
		const { props: { dispatch } } = this;

		dispatch(actions.updateBlockCreator({ selected: value }));
	}

	/**
	 * @param {MouseEvent} e 
	 */
	@autobind
	onMouseDownOrTouchStartDocument(e) {
		const { target } = e;
		const { props: { dispatch } } = this;
		const $e = findDOMNode(this);

		if ($e && !$e.contains(target)) {
			dispatch(actions.updateBlockCreator({ visible: false }));
			document.removeEventListener('mousedown', this.onMouseDownOrTouchStartDocument);
			document.removeEventListener('touchstart', this.onMouseDownOrTouchStartDocument);
		}
	}

	render() {
		const { props: { model } } = this;

		return model.get('visible') ? (
			<div styleName='base' style={{
				position: 'absolute',
				left: model.get('x'),
				top: model.get('y'),
			}}
			>
				<select value={model.get('selected')} onChange={this.onChangeSelect}>
					{_.map(BLOCK.CREATABLE_BLOCK_LIST, (a, i) => <option value={a} key={i}>{OPTION_NAME_LIST[i]}</option>)}
				</select>
				<button onClick={this.onClick}>
					ADD
				</button>
			</div>
		) : null;
	}
}
