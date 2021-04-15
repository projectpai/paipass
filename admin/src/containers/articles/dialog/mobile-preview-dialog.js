import React from 'react';
import FlexView from 'react-flexview';

import { MobilePreview } from '../../../common';

const MobilePreviewDialog = ({ url }) => {
    return (
        <FlexView marginLeft="auto" marginRight="auto" marginTop="8px">
            <MobilePreview url={url}/>
        </FlexView>
    );
};

export default MobilePreviewDialog;