import { createContext } from 'react';

import AccountService from '../services/Account';
import OathService from '../services/Oauth';
import SsoService from '../services/Sso';


export const ServicesContext = createContext({
  accountService: new AccountService(),
  oauthService: new OathService(),
  ssoService: new SsoService(),
});
