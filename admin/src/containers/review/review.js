import React from 'react';
import FlexView from 'react-flexview';
import { Button, Overlay, Classes, Card, Checkbox, Icon, InputGroup, RadioGroup, Radio } from '@blueprintjs/core';
import { Select } from "@blueprintjs/select";
import { DateInput } from "@blueprintjs/datetime";

import { Video, FormConfirm, Renderer } from '../../common';

import './review.scss';

const rejectReasons = [
    { label: 'Select a reason', value: 0 },
    { label: 'We had trouble authenticating the audio. Remember to speak slowly and clearly.', value: 1 },
    { label: 'The video was too blurry to authenticate. Remember to keep your camera steady.', value: 2 },
    { label: 'Please use a government issued ID for the authentication process.', value: 3 },
    { label: 'We were not able to match your name in the user profile to the ID in the video.', value: 4 },
];

const reasonFormatter = function(onChange) {
    return {
        id: "reason",
        items: rejectReasons,
        itemRenderer: Renderer.menuItemRenderer,
        filterable: false,
        onItemSelect: e => onChange({ target: { name: 'rejectReason', value: e.label }}),
    };
};

const Review = (props) => {
    const { 
        review,
        handleSubmit,
        handleInputChange,
        handleRotate,
        handleReviewClose,
        rotated,
    } = props;

    return (
        <Overlay
            className={Classes.OVERLAY_SCROLL_CONTAINER}
            isOpen
            onClose={handleReviewClose}
            canOutsideClickClose
            canEscapeKeyClose>
            <Card style={{height: '100vh', top: 0, bottom: 0, right: 0, overflowY: 'auto', padding: '8px'}}>
                <Button icon='cross' intent='danger' minimal onClick={handleReviewClose}>
                    Close
                </Button>

                <FlexView column hAlignContent="center">
                    {review.urlVideo && <Video url={review.urlVideo} rotated={rotated}/>}

                    <FlexView column marginLeft="8px">
                        <FormConfirm onSubmit={handleSubmit} submit={{
                            intent: 'primary',
                            className: 'review-submit-button',
                            loading: review.fetching,
                        }}>
                            <FlexView vAlignContent="center" marginTop="8px">
                                <label htmlFor="fullName">Full Name:</label>
                                <InputGroup id="fullName"
                                    className="review-input"
                                    name="fullName"
                                    disabled={true}
                                    onChange={handleInputChange}
                                    value={review.fullName}
                                />
                            </FlexView>

                            <FlexView marginTop="8px">
                                <Checkbox checked={rotated} onChange={handleRotate}>
                                    <Icon icon="image-rotate-left" />
                                    <span>Mirror video</span>
                                </Checkbox>
                            </FlexView>

                            <FlexView marginTop="8px" vAlignContent="bottom" wrap>
                                <FlexView>
                                    <RadioGroup
                                        name="status"
                                        label="Review conclusion"
                                        onChange={handleInputChange}
                                        selectedValue={review.status}
                                    >
                                        <Radio label="Accept" value="ACCEPTED" />
                                        {/* <Radio label="Flag for follow up" value="UNSURE" /> */}
                                        <Radio label="Reject" value="REJECTED" />
                                    </RadioGroup>
                                </FlexView>

                                <FlexView grow/>

                                <FlexView vAlignContent="center">
                                    <label htmlFor="gender">Reason:</label>
                                    <FlexView marginLeft="8px"/>
                                    <Select
                                        {...reasonFormatter(handleInputChange)}
                                        disabled={review.status !== 'REJECTED'}
                                    >
                                        <Button 
                                            className="review-reason"
                                            text={review.rejectReason === '' ? rejectReasons[0].label : `${review.rejectReason.slice(0, 20)} ...`} 
                                            rightIcon="caret-down"
                                            disabled={review.status !== 'REJECTED'}
                                        />
                                    </Select>
                                </FlexView>
                            </FlexView>
                        </FormConfirm>
                    </FlexView>
                </FlexView>
            </Card>
        </Overlay>
    );
};

export default Review;
