import React from 'react';
import { Intent } from '@blueprintjs/core';

import { FormConfirm } from '../../../common';
import Region from '../region';

import './edit-message.scss';

const EditMessage = ({ onRequestClose, message, handleChange, onConfirm }) => (
    <FormConfirm
        onSubmit={event => { onConfirm(message).then(onRequestClose); }} 
        submit={{ intent: Intent.PRIMARY, className: 'submit-edit' }}
    >
        <Region 
            message={message}
            handlePreview={false}
            handleChange={handleChange} />
    </FormConfirm>
);

export default EditMessage;
