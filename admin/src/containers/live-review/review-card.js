import React from 'react';
import FlexView from 'react-flexview';
import { Button, Card, Callout, Elevation } from "@blueprintjs/core";

import { Timer } from '../../common';

const ReviewCard = ({
    review,
    expires=90000,
    handleOpenReview,
    handleExpiredReview,
}) => {
    return (
        <Card interactive elevation={Elevation.THREE} onClick={() => handleOpenReview(review)}>
            <Callout icon="eye-open" title={`${review.firstName} ${review.lastName}`}>
                <FlexView grow>
                    <FlexView grow wrap vAlignContent="center">
                        <span>Region: {review.region}</span>

                        <FlexView marginRight="32px" />

                        <Timer 
                            startTime={review.arrived.getTime()}
                            endTime={review.arrived.getTime() + expires}
                            onFinish={() => handleExpiredReview(review.paiId)}
                        />
                    </FlexView>

                    <Button minimal icon="cross" onClick={(e) => {
                        e.stopPropagation();
                        handleExpiredReview(review.paiId);
                    }}/>
                </FlexView>
            </Callout>
        </Card>
    );
};

export default ReviewCard;
