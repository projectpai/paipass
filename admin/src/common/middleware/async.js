export default function ({ dispatch }) {
  return next => action => {

    // if action does not have payload
    // or, the payload does not have a .then property
    // or, it has status (request is finished)
    // we don't care about it, send it on

    if (!action.payload || !action.payload.then || action.payload.status) {
      return next(action);
    }

    action.payload.then((response) => {
      action.payload = response;
      dispatch(action);
    }).catch((error) => {
      action.payload = error;
      dispatch(action);
    });

  };
}