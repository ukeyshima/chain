import { List } from 'immutable';
import { Block } from '../models';
import { handleActions } from 'redux-actions';
import actions from '../actions';
import { BLOCK, PIN, EMPTY_HANDWRITING } from '../constants';
import colors from '../shared/vars.scss';

const { blue2, white0 } = colors;

export default handleActions({
	[actions.addBlock]: (state, action) => {
		const { payload } = action;

		return state.push(new Block(payload));
	},
	[actions.updateBlock]: (state, action) => {
		const { payload: { id, patch } } = action;
		const index = state.findIndex((a) => a.get('id') === id);

		return state.update(index, (block) => block.merge(patch).set('handwriting', EMPTY_HANDWRITING));
	},
	[actions.deleteBlock]: (state, action) => {
		const { payload } = action;
		const index = state.findIndex((a) => a.get('id') === payload);

		return state.filter((a, i) => i !== index);
	},
	[actions.deltaMoveBlock]: (state, action) => {
		const { payload: { id, dx, dy } } = action;
		const index = state.findIndex((a) => a.get('id') === id);

		return state.update(index, (block) => block.dmove(dx, dy));
	},
	[actions.addPin]: (state, action) => {
		const { payload } = action;
		const index = state.findIndex((a) => a.get('id') === payload);

		return state.update(index, (block) => block.updateIn(['inputPins'], (pins) => pins.push(block.createPin(block.type === BLOCK.TYPE_FUNCTION ? blue2 : white0, PIN.TYPE_INPUT))).recalculateHeight());
	},
	[actions.deletePin]: (state, action) => {
		const { payload: { id } } = action;
		const index = state.findIndex((a) => a.get('id') === id);

		return state.update(index, (block) => block.updateIn(['inputPins'], (pins) => pins.slice(0, Math.max(1, pins.size - 1))).recalculateHeight());
	},
	[actions.clearViewBlock]: (state) => {
		return state.update(0, (block) => block.set('value', ''));
	},
	[actions.pushViewBlock]: (state, action) => {
		const { payload } = action;

		return state.update(0, (block) => {
			const value = block.get('value');
			return block.set('value', value ? `${value}\n${payload}` : payload);
		});
	},
	[actions.updateHandwriting]: (state, action) => {
		const { payload: { id, handwriting } } = action;
		const index = state.findIndex((a) => a.get('id') === id);
		const { flattenArgs: { length }, expression } = handwriting;

		return state.update(index, (block) => {
			if (block.get('type') === BLOCK.TYPE_MATH) {
				block = block.updateIn(['inputPins'], (pins) => pins.clear());

				for (let i = 0; i < length; i += 1) {
					block = block.updateIn(['inputPins'], (pins) => pins.push(block.createPin(white0, PIN.TYPE_INPUT)));
				}
			}

			return block.set('handwriting', handwriting).set('value', expression);
		});
	}
}, List());
