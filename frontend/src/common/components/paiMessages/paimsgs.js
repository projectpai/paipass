// If this is being used outside paipass modify the following two lines
// to fit into the associated app.
import zoid from 'zoid';
const URL_BASE = process.env.REACT_APP_API_URL;

window.PaiMsgsZoidComponent = zoid.create({

  // The html tag used to render my component

  tag: 'pai-msgs-component',

  // The url that will be loaded in the iframe or popup, when someone includes my component on their page

  url: new URL(`${URL_BASE}/pai-messages/`, window.location.href).href
});
