import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import { List } from 'immutable';
import { Link } from 'react-router-dom';

import { OfferEntity } from '../../entities/Offer';

export const Offer = ({ item, onRevoke }) => {
  return (
    <div className="request-items d-flex justify-content-center m-1">
      <div className="flex-grow-1 text-left">
        <span className="m-0">{item.name}</span>
      </div>
      <div className="d-flex">
        <Link to={`/manage/${item.uuid}`}>
          <Button variant="outlined" color="primary" className="primary mr-1">
            Manage
          </Button>
        </Link>
        <Button onClick={() => onRevoke({ uuid: item.uuid })} variant="outlined" color="secondary" className="red mf-1">
          Revoke
        </Button>
      </div>
    </div>
  );
};

Offer.propTypes = {
  item: PropTypes.instanceOf(OfferEntity),
  onRevoke: PropTypes.func.isRequired,
};

export const OfferList = ({ items, onRevoke }) => {
  const renderOffer = offer => <Offer key={offer.uuid} item={offer} onRevoke={onRevoke} />;
  const offers = items.map(renderOffer);

  return (
    <Fragment>
      {offers}
    </Fragment>
  );
};

OfferList.propTypes = {
  items: PropTypes.instanceOf(List).isRequired,
  onRevoke: PropTypes.func.isRequired,
};
