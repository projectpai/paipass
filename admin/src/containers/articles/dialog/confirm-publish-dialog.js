import React, { Fragment } from 'react';
import FlexView from 'react-flexview';
import { Button, Intent } from '@blueprintjs/core';

const ConfirmPublishDialog = ({article, publish, onConfirm, onRequestClose}) => {
    return (
        <Fragment>
            <p>Lorem ipsum...</p>

            <FlexView marginLeft="auto" marginRight="auto" marginTop="8px">
                <Button
                    intent={Intent.PRIMARY}
                    text={publish ? 'Yes, publish it' : 'Unpublish it'} 
                    onClick={e => {
                        onConfirm(article);
                        onRequestClose();
                    }} 
                />  
            </FlexView>

            <FlexView marginLeft="auto" marginRight="auto" marginTop="8px">
                <Button 
                    minimal 
                    onClick={onRequestClose}>
                    Cancel
                </Button>
            </FlexView>
        </Fragment>
    );
};

export default ConfirmPublishDialog;