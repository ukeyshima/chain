import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import actions from '../actions';
import autobind from 'autobind-decorator';
import IndentTextarea from '../components/IndentTextarea';
import { getMouseOrFirstTouchPosition } from '../util';
import { BLOCK, PIN } from '../constants';
import _ from 'lodash';
import MyScript from 'myscript/dist/myscript.min.js';
import latex2js from '../latex2js';
import './Block.scss';

window.ontouchmove = () => { };

@connect()
export default class Block extends Component {
	constructor() {
		super();

		this.prevX = 0;
		this.prevY = 0;
	}

	componentDidMount() {
		const { props: { model } } = this;

		if (model.get('type') === BLOCK.TYPE_MATH) {
			const $editor = findDOMNode(this).querySelector('[data-handwriting]');

			$editor.addEventListener('exported', this.onExported);
			MyScript.register($editor, {
				recognitionParams: {
					type: 'MATH',
					apiVersion: 'V4',
					server: {
						applicationKey: '331b4bdf-7ace-4265-94f1-b01504c78743',
						hmacKey: '44f4f4ce-fd0f-48a1-b517-65d2b9465413'
					},
					v4: {
						math: {
							mimeTypes: ['application/x-latex']
						}
					}
				}
			});
		}
	}

	@autobind
	onExported(e) {
		const { props: { model, dispatch } } = this;
		const { detail: { exports: { 'application/x-latex': handwriting } } } = e;

		dispatch(actions.updateHandwriting({
			id: model.get('id'),
			handwriting: latex2js(handwriting)
		}));
	}

	/**
	 * @param {Event} e 
	 */
	@autobind
	onChange(e) {
		const { props: { model, dispatch } } = this;

		dispatch(actions.updateBlock(model.get('id'), { value: e.currentTarget.value }));
	}

	@autobind
	onClickDeleteButton() {
		const { props: { model, dispatch } } = this;
		const id = model.get('id');

		dispatch(actions.deleteBlock(id));
	}

	/**
	 * @param {MouseEvent} e
	 */
	@autobind
	onMouseDownOrTouchStart(e) {
		const { target: { dataset } } = e;

		if (_.has(dataset, 'draggable')) {
			const { pageX, pageY } = getMouseOrFirstTouchPosition(e);

			this.prevX = pageX;
			this.prevY = pageY;
			document.body.classList.add('cursor-move');
			document.addEventListener('mousemove', this.onMouseMoveOrTouchMoveDocument);
			document.addEventListener('mouseup', this.onMouseUpOrTouchEndDocument);
			document.addEventListener('touchmove', this.onMouseMoveOrTouchMoveDocument);
			document.addEventListener('touchend', this.onMouseUpOrTouchEndDocument);
		}
	}

	/**
	 * @param {MouseEvent} e
	 */
	@autobind
	onMouseMoveOrTouchMoveDocument(e) {
		const { pageX, pageY } = getMouseOrFirstTouchPosition(e);
		const { props: { model, dispatch }, prevX, prevY } = this;

		e.preventDefault();
		dispatch(actions.deltaMoveBlock(model.get('id'), pageX - prevX, pageY - prevY));
		this.prevX = pageX;
		this.prevY = pageY;
	}

	@autobind
	onMouseUpOrTouchEndDocument() {
		document.body.classList.remove('cursor-move');
		document.removeEventListener('mousemove', this.onMouseMoveOrTouchMoveDocument);
		document.removeEventListener('mouseup', this.onMouseUpOrTouchEndDocument);
		document.removeEventListener('touchmove', this.onMouseMoveOrTouchMoveDocument);
		document.removeEventListener('touchend', this.onMouseUpOrTouchEndDocument);
	}

	@autobind
	addPin() {
		const { props: { model, dispatch } } = this;

		dispatch(actions.addPin(model.get('id')));
	}

	@autobind
	deletePin() {
		const { props: { model, dispatch } } = this;

		dispatch(actions.deletePin({
			id: model.get('id'),
			removed: model.get('inputPins').size - 1
		}));
	}

	/**
	 * @param {KeyboardEvent} e
	 */
	@autobind
	onKeyDown(e) {
		const { keyCode, currentTarget: { selectionStart, selectionEnd } } = e;
		const { props: { dispatch, model } } = this;

		if (keyCode === 9) {
			e.preventDefault();
			const v = model.get('value');
			dispatch(actions.updateBlock(model.get('id'), { value: `${v.substring(0, selectionStart)}\t${v.substring(selectionEnd)}` }));
		}
	}

	render() {
		const { props: { model } } = this;
		const color = model.get('color');
		const type = model.get('type');

		if (type === BLOCK.TYPE_MATH) {
			const { args } = model.get('handwriting');

			return (
				<div data-draggable styleName='base' onMouseDown={this.onMouseDownOrTouchStart} onTouchStart={this.onMouseDownOrTouchStart} style={{
					position: 'absolute',
					left: model.get('x'),
					top: model.get('y'),
					height: model.get('height')
				}}
				>
					<div data-draggable>
						{model.get('deletable') ? <button styleName='red' onClick={this.onClickDeleteButton}>x</button> : null}
					</div>
					<div data-draggable styleName='textarea-div'>
						{
							_.map(args, ({ char }, i) => {
								return (
									<div styleName='math-arg' key={i} style={{
										left: 2,
										top: (PIN.RADIUS + 1) * 2 * i + 5 + 1
									}}
									>
										{char}
									</div>
								);
							})
						}
						<div styleName='math' data-handwriting />
					</div>
				</div>
			);
		}

		return (
			<div data-draggable styleName='base' onMouseDown={this.onMouseDownOrTouchStart} onTouchStart={this.onMouseDownOrTouchStart} style={{
				position: 'absolute',
				left: model.get('x'),
				top: model.get('y'),
				height: model.get('height')
			}}
			>
				<div data-draggable>
					{model.get('deletable') ? <button styleName='red' onClick={this.onClickDeleteButton}>x</button> : null}
					{model.get('changeable') ? <button onClick={this.addPin}>+</button> : null}
					{model.get('changeable') ? <button onClick={this.deletePin}>-</button> : null}
				</div>
				<div data-draggable styleName='textarea-div'>
					<IndentTextarea readOnly={!model.get('editable')} onChange={this.onChange} value={model.get('value')} spellCheck={false} style={{ borderLeft: `5px solid ${color}` }} onKeyDown={this.onKeyDown} />
				</div>
			</div>
		);
	}
}
