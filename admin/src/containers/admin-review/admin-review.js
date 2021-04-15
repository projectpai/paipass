import React from 'react';
import FlexView from 'react-flexview';
import { Button, Overlay, Classes, Card, Checkbox, Icon, InputGroup, RadioGroup, Radio } from '@blueprintjs/core';
import { Select } from "@blueprintjs/select";
import { DateInput } from "@blueprintjs/datetime";

import { Video, FormConfirm, Renderer } from '../../common';

import './admin-review.scss';

const rejectReasons = [
    { label: 'Select a reason', value: 0 },
    { label: 'Left the business unit.', value: 1 },
    { label: 'Insufficient credentials.', value: 2 },
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


const AdminReview = (props) => {
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



                    <FlexView column marginLeft="8px">
                        <FormConfirm onSubmit={handleSubmit} submit={{
                            intent: 'primary',
                            className: 'review-submit-button',
                            loading: review.fetching,
                        }}>
                            <FlexView vAlignContent="center" marginTop="8px">
                                <label htmlFor="name">Full Name:</label>
                                <InputGroup id="name"
                                    className="review-input"
                                    name="name"
                                    disabled={true}
                                    onChange={handleInputChange}
                                    value={review.name}
                                />
                            </FlexView>

                            <FlexView marginTop="8px" vAlignContent="bottom" wrap>
                                <FlexView>
                                    <RadioGroup
                                        name="status"
                                        label="Admin Account Conclusion"
                                        onChange={handleInputChange}
                                        selectedValue={review.status}
                                    >
                                        <Radio label="Promote" value="PROMOTE" />
                                        {/* <Radio label="Flag for follow up" value="UNSURE" /> */}
                                        <Radio label="Demote" value="DEMOTE" />
                                        <Radio label="Delete" value="DELETE" />
                                    </RadioGroup>
                                </FlexView>

                                <FlexView grow/>


                            </FlexView>
                        </FormConfirm>
                    </FlexView>
            </Card>
        </Overlay>
    );
};

export default AdminReview;
