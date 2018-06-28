import { handleActions } from 'redux-actions';
import actions from '../actions';
import initialHtml from './initial.html';

export default handleActions({
	[actions.onChangeHtml]: (state, action) => {
		const { payload } = action;

		return payload;
	},
}, initialHtml);
