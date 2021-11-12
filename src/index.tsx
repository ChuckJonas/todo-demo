import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { debounce } from 'lodash';

//local storage can be managed outside of react app.

const LOCAL_KEY_CHANGES = 'changes';
let localData = window.localStorage.getItem(LOCAL_KEY_CHANGES) as any;

//should really validate data instead of trusting parsed json
try{
  localData = localData ? JSON.parse(localData) : {};
}catch(e){
  localData = {};
}

// debounce so we don't spam this
// (although, if the timer is running, it won't update until paused)
const updateLocalStorage = debounce(changes => {
  console.log('updating local storage');
  window.localStorage.setItem('changes', JSON.stringify(changes));
}, 1000);

ReactDOM.render(
  <React.StrictMode>
    <App initChanges={localData} onSaveChanges={updateLocalStorage} />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
