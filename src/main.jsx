import 'core-js/stable';
import 'regenerator-runtime/runtime';

import React from 'react';

import { render } from 'react-dom';
import { Provider } from 'react-redux';

// utils
import { initGA, logPageView } from 'utils/analytics';

import { store, history } from './store';
import Routes from './routes';

import './styles/index.scss';

// es6 shim for .finally() in promises
require('es6-promise').polyfill();
const finallyShim = require('promise.prototype.finally');

finallyShim.shim();

// Google Analytics
// process.env.NODE_ENV === 'production' && ReactGA.initialize(process.env.GA);

// Google Analytics
if (!window.GA_INITIALIZED) {
  initGA();
  window.GA_INITIALIZED = true;
}
logPageView();


render(
  <Provider store={store}>
    {/* Tell the Router to use our enhanced history */}
    <Routes history={history} />
  </Provider>,
  document.getElementById('app')
);
