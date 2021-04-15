import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import { SnackbarProvider } from 'notistack';
import { Provider } from 'react-redux';
import Routes from './Routes';
import { unregister } from './registerServiceWorker';
import Store from './store/Store';
import AppLocalizationProvider from './l10n'
import './index.scss';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#000',
      dark: '#212121',
      light: '#484848',
      contrastText: '#fff',
    },
    secondary: {
      main: '#fff',
      contrastText: '#000',
    },
  },
});

ReactDOM.render(

  <BrowserRouter>
      <Provider store={Store}>
        <AppLocalizationProvider>

          <MuiThemeProvider theme={theme}>
            <SnackbarProvider maxSnack={3}>
             <Routes />
            </SnackbarProvider>
          </MuiThemeProvider>
        </AppLocalizationProvider>

      </Provider>
  </BrowserRouter>,

  document.getElementById('root'),
);
unregister();
