import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';

import 'sweetalert2/src/sweetalert2.scss';
import 'fontsource-roboto';

import './index.css';
import App from './App';


// todo
// eslint-disable-next-line react/no-deprecated
ReactDOM.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
  document.getElementById('root'),
);
