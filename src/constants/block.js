import _ from 'lodash';
import vars from '../shared/vars.scss';

const { blockWidth: strblockWidth } = vars;
export const WIDTH = _.parseInt(strblockWidth);
export const TYPE_VALUE = 'VALUE';
export const TYPE_FUNCTION = 'FUNCTION';
export const TYPE_PROPERTY = 'PROPERTY';
export const TYPE_OPERATOR = 'OPERATOR';
export const TYPE_VIEW = 'VIEW';
export const TYPE_MATH = 'MATH';
