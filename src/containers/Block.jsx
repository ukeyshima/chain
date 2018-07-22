import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import actions from '../actions';
import autobind from 'autobind-decorator';
import IndentTextarea from '../components/IndentTextarea';
import { getMouseOrFirstTouchPosition } from '../util';
import { BLOCK, PIN } from '../constants';
import _ from 'lodash';
import MyScript from 'myscript/dist/myscript.min.js';
import latex2js from '../latex2js';
import Undo from 'react-icons/lib/fa/mail-reply';
import Redo from 'react-icons/lib/fa/mail-forward';
import styles from './Block.scss';

window.ontouchmove = () => { };

const { white1 } = styles;

@connect()
export default class Block extends Component {
	constructor() {
		super();

		this._prevX = 0;
		this._prevY = 0;
		this._startX = 0;
		this._startY = 0;
		this._startWidth = 0;
		this._startHeight = 0;
		this._editor = React.createRef();
		this._canClearMathEditor = true;
	}

	componentDidMount() {
		const { props: { model }, _editor: { current: $editor } } = this;
		const type = model.get('type');

		if ($editor) {
			$editor.addEventListener('exported', this.onExported);
			MyScript.register($editor,
				{
					recognitionParams: {
						type: type === BLOCK.TYPE_MATH || type === BLOCK.TYPE_VALUE || type === BLOCK.TYPE_OPERATOR ? 'MATH' : 'TEXT',
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
				},
				{
				},
				{
					ink: {
						color: white1
					}
				}
			);
		}
	}

	@autobind
	onExported(e) {
		const { props: { model, dispatch }, _canClearMathEditor } = this;
		const { detail: { exports } } = e;

		if (_canClearMathEditor) {
			dispatch(actions.updateHandwriting({
				id: model.get('id'),
				handwriting: latex2js(exports === undefined ? '' : exports['application/x-latex'] || exports['text/plain'] || '')
			}));
		}
		this._canClearMathEditor = true;
	}

	@autobind
	clearMathEditor() {
		const { _editor: { current: { editor } } } = this;

		editor.clear();
	}

	@autobind
	undoMathEditor() {
		const { _editor: { current: { editor } } } = this;

		editor.undo();
	}

	@autobind
	redoMathEditor() {
		const { _editor: { current: { editor } } } = this;

		editor.redo();
	}

	/**
	 * @param {Event} e 
	 */
	@autobind
	onChange(e) {
		const { props: { model, dispatch }, _editor: { current: $editor } } = this;
		const { currentTarget: { value } } = e;

		this._canClearMathEditor = false;
		dispatch(actions.updateBlock(model.get('id'), { value }));

		if ($editor) {
			const { editor } = $editor;

			editor.clear();
		}
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

			this._prevX = pageX;
			this._prevY = pageY;
			document.body.classList.add('move');
			document.addEventListener('mousemove', this.onMouseMoveOrTouchMoveDocument, { passive: true });
			document.addEventListener('mouseup', this.onMouseUpOrTouchEndDocument);
			document.addEventListener('touchmove', this.onMouseMoveOrTouchMoveDocument, { passive: true });
			document.addEventListener('touchend', this.onMouseUpOrTouchEndDocument);
		}
	}

	/**
	 * @param {MouseEvent} e
	 */
	@autobind
	onMouseMoveOrTouchMoveDocument(e) {
		const { pageX, pageY } = getMouseOrFirstTouchPosition(e);
		const { props: { model, dispatch }, _prevX, _prevY } = this;

		dispatch(actions.deltaMoveBlock(model.get('id'), pageX - _prevX, pageY - _prevY));
		this._prevX = pageX;
		this._prevY = pageY;
	}

	@autobind
	onMouseUpOrTouchEndDocument() {
		document.body.classList.remove('move');
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

	/**
	 * @param {MouseEvent} e
	 */
	@autobind
	onResizeMouseDownOrTouchStart(e) {
		const { props: { model } } = this;
		const { pageX, pageY } = getMouseOrFirstTouchPosition(e);

		this._startX = pageX;
		this._startY = pageY;
		this._startWidth = model.get('width');
		this._startHeight = model.get('height');
		document.body.classList.add('nwse-resize');
		document.body.addEventListener('mousemove', this.onResizeMouseMoveOrTouchMoveDoc);
		document.body.addEventListener('touchmove', this.onResizeMouseMoveOrTouchMoveDoc);
		document.body.addEventListener('mouseup', this.onResizeMouseUpDoc);
		document.body.addEventListener('touchend', this.onResizeMouseUpDoc);
	}

	/**
	 * @param {MouseEvent} e
	 */
	@autobind
	onResizeMouseMoveOrTouchMoveDoc(e) {
		const {
			_startX, _startY, _startWidth, _startHeight, _editor: { current: $editor },
			props: { dispatch, model }
		} = this;
		const { pageX, pageY } = getMouseOrFirstTouchPosition(e);

		dispatch(actions.resizeBlock({
			width: _startWidth + (pageX - _startX),
			height: _startHeight + (pageY - _startY),
			id: model.get('id')
		}));

		if ($editor) {
			const { editor } = $editor;

			editor.resize();
		}
	}

	@autobind
	onResizeMouseUpDoc() {
		document.body.classList.remove('nwse-resize');
		document.body.removeEventListener('mousemove', this.onResizeMouseMoveOrTouchMoveDoc);
		document.body.removeEventListener('touchmove', this.onResizeMouseMoveOrTouchMoveDoc);
		document.body.removeEventListener('mouseup', this.onResizeMouseUpDoc);
		document.body.removeEventListener('touchend', this.onResizeMouseUpDoc);
	}

	render() {
		const { props: { model } } = this;
		const color = model.get('color');
		const type = model.get('type');
		const { flattenArgs } = model.get('handwriting');

		return (
			<div data-draggable styleName='base' onMouseDown={this.onMouseDownOrTouchStart} onTouchStart={this.onMouseDownOrTouchStart} style={{
				position: 'absolute',
				left: model.get('x'),
				top: model.get('y'),
				width: model.get('width'),
				height: model.get('height')
			}}
			>
				<div data-draggable>
					{model.get('deletable') ? <button styleName='red' onClick={this.onClickDeleteButton}>x</button> : null}
					{model.get('changeable') ? (
						<Fragment>
							<button onClick={this.addPin}>+</button>
							<button onClick={this.deletePin}>-</button>
						</Fragment>
					) : null}
					{type === BLOCK.TYPE_TIMER ? <div styleName='tag'>FPS</div> : null}
					{_.includes(BLOCK.CREATABLE_BLOCK_LIST, type) ? (
						<Fragment>
							<button onClick={this.clearMathEditor}>
								Clear
							</button>
							<button onClick={this.undoMathEditor}>
								<Undo />
							</button>
							<button onClick={this.redoMathEditor}>
								<Redo />
							</button>
						</Fragment>
					) : null}
				</div>
				{_.includes(BLOCK.CREATABLE_BLOCK_LIST, type) ? (
					<div data-draggable styleName='math-div'>
						<input type='text' readOnly={!model.get('editable')} value={model.get('value')} onChange={this.onChange} style={{ borderLeft: `5px solid ${color}` }} />
						{
							_.map(flattenArgs, (arg, i) => {

								return (
									<div styleName='math-arg' key={i} style={{ top: (PIN.WIDTH) * 2 * i + 6 }}>
										{arg}
									</div>
								);
							})
						}
						<div styleName='math' ref={this._editor} />
					</div>
				) : (
						<div data-draggable styleName='textarea-div'>
							<IndentTextarea readOnly={!model.get('editable')} onChange={this.onChange} value={model.get('value')} spellCheck={false} style={{ borderLeft: `5px solid ${color}` }} onKeyDown={this.onKeyDown} />
						</div>
					)
				}
				{model.get('resizable') ? <div styleName='resizer' onMouseDown={this.onResizeMouseDownOrTouchStart} onTouchStart={this.onResizeMouseDownOrTouchStart} /> : null}
			</div>
		);
	}
}
