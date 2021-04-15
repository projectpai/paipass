import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';
import { User } from './User';
import { VideoAuthentication } from './VideoAuthentication';
import {Pdp2Subscription} from './Pdp2';
import { Applications } from './Applications';
import { Attributes } from './Attributes';
import { Values } from './Values';
import {Pdp2Txns} from '../containers/managePdp2Txns/reducer';
import {Datasets} from '../containers/pdp2Datasets/reducer';
import {PaiMessages, PaiMessageThreads} from '../containers/paiMessages/reducer';

const reducers = combineReducers({
  User,
  VideoAuthentication,
  Pdp2Subscription,
  Pdp2Txns,
  Datasets,
  Applications,
  Attributes,
  Values,
  PaiMessages,
  PaiMessageThreads,
});

export default createStore(
  reducers,
  {},
  composeWithDevTools(applyMiddleware(thunkMiddleware)),
);
