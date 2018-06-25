import React, { Component } from 'react';
import { Provider } from 'react-redux';
import Chain from '../containers/Chain';
import { createStore } from 'redux';
import state from '../reducers';
import { enableBatching } from 'redux-batched-actions';
import { HashRouter, Route, NavLink, Redirect } from 'react-router-dom';
import HTMLRenderer from '../containers/HTMLRenderer';
import HTMLEditor from '../containers/HTMLEditor';
import actions from '../actions';
import { ToastContainer } from 'react-toastify';
import { BLOCK } from '../constants';
import styles from './App.scss';

const { link, active } = styles;
const store = createStore(enableBatching(state));

store.dispatch(actions.addBlock({ x: 100, y: 100, type: BLOCK.TYPE_VIEW }));

const redirectRender = () => <Redirect to='/chain' />;

class App extends Component {
	render() {
		return (
			<Provider store={store}>
				<HashRouter>
					<div styleName='wrap'>
						<div styleName='base'>
							<HTMLRenderer />
							<Route exact path='/' render={redirectRender} />
							<Route path='/chain' component={Chain} />
							<Route path='/editor' component={HTMLEditor} />
						</div>
						<footer>
							<NavLink to='/chain' className={link} activeClassName={active}>
								<span>Chain</span>
							</NavLink>
							<NavLink to='/editor' className={link} activeClassName={active}>
								<span>Editor</span>
							</NavLink>
							<NavLink to='/view' className={link} activeClassName={active}>
								<span>View</span>
							</NavLink>
						</footer>
						<ToastContainer autoClose={3000} />
					</div>
				</HashRouter>
			</Provider>
		);
	}
}

export default App;
