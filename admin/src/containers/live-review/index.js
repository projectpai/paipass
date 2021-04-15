import React, { Component } from 'react';
import FlexView from 'react-flexview';

import { Button, H3, MenuItem, Intent } from '@blueprintjs/core';
import { MultiSelect } from '@blueprintjs/select';

import { DataManager } from '../../common';
import { regions } from '../../common/constants';
import ReviewCard from './review-card';
import { Review } from '../review';

import './live-review.scss';

const DEFAULT_STATUS = 'UNSURE';
const GET_REVIEW_INTERVAL = 60000;
const REVIEW_EXPIRES=180000;
const REGION_ITEMS = [...regions];

class LiveReviewContainer extends Component {
    state = {
        review: null,
        reviews: [],
        rotated: false,
        fetching: false,
        regions: JSON.parse(localStorage.getItem('regions')) || [],
    };

    constructor(props) {
        super(props);

        // update the regionItems references
        REGION_ITEMS.forEach((rItem, index) => {
            const targetItem = this.state.regions.find(region => rItem.value === region.value);
            if (targetItem) {
                REGION_ITEMS[index] = targetItem;
            }
        });

        this.handleOpenReview = this.handleOpenReview.bind(this);
        this.handleExpiredReview = this.handleExpiredReview.bind(this);
        this.handleGetReviews = this.handleGetReviews.bind(this);
        this.handleStopReviews = this.handleStopReviews.bind(this);
        this.handleRegionSelect = this.handleRegionSelect.bind(this);
        this.handleTagRemove = this.handleTagRemove.bind(this);
        this.handleClear = this.handleClear.bind(this);
        this.renderItem = this.renderItem.bind(this);
        this.handleRotate = this.handleRotate.bind(this);
        this.handleCloseReview = this.handleCloseReview.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    componentDidMount() {
        this._isMounted = true;
        this.handleGetReviews();
    }
    
    componentWillUnmount() {
        this._isMounted = false;
    }
    
    handleRegionSelect(region) {
        if (!this.isRegionSelected(region)) {
            this.selectRegion(region);
        } else {
            this.deselectRegion(this.getSelectedRegionIndex(region));
        }
    }

    isRegionSelected(region) {
        return this.getSelectedRegionIndex(region) !== -1;
    }

    selectRegion(region) {
        this.setState(
            { regions: [...this.state.regions, region] },
            () => { localStorage.setItem('regions', JSON.stringify(this.state.regions)); }
        );
    }

    deselectRegion(index) {
        this.setState(
            { regions: this.state.regions.filter((_region, i) => i !== index) },
            () => { localStorage.setItem('regions', JSON.stringify(this.state.regions)); }
        );
    }

    getSelectedRegionIndex(region) {
        return this.state.regions.indexOf(region);
    }

    handleClear() {
        this.setState({ regions: [] }, () => {
            localStorage.setItem('regions', JSON.stringify(this.state.regions));  
        }); 
    }

    handleInputChange (event) {
        this.setState({ review: { 
            ...this.state.review,
            [event.target.name]: event.target.value,
        }});
    }

    handleTagRemove(_tag, index) {
        this.deselectRegion(index);
    }

    handleGetReviews() {
        if (this._isMounted) {
            this.getReview();
    
            this.setState({ fetching: true }, () => {
                this.getReviewId = setInterval(() => {
                    if (this.state.fetching) {
                        this.getReview();
                    } else {
                        clearInterval(this.getReviewId);
                    }
                }, GET_REVIEW_INTERVAL);
            });
        }
    }

    handleStopReviews() {
        this.setState({ fetching: false });
    }

    handleOpenReview(review) {
        this.setState({ review: {
            ...review,
            rejectReason: ''
        } });
    }

    handleCloseReview() {
        this.setState({ review: null });
    }

    handleSubmit() {
        this.setState({ review: { ...this.state.review, fetching: true } }, () => {
            DataManager.instance
                .postReview(this.state.review)
                .then(() => { this.handleExpiredReview(this.state.review.paiId); })
                .then(success => { this.setState({ review: null }); });
        });
    }

    handleExpiredReview(id) {
        this.setState({ reviews: this.state.reviews.filter(review => review.paiId !== id) });
    }

    handleRotate() {
        this.setState({ rotated: !this.state.rotated });
    }

    addReview(review) {
        this.setState({ reviews: [ ...this.state.reviews, {
            ...review, arrived: new Date()
        }] });
    }

    getReview() {
        DataManager.instance
            .getReview(this.state.regions)
            .then(result => {
                if (result && !this.state.reviews
                        .find(review => review.paiId === result.paiId)
                ) {
                    result.status = DEFAULT_STATUS;
                    this.addReview(result);
                }
            });
    }

    renderTag(item) {
        return item.label;
    }

    renderItem(item, { modifiers, handleClick }) {

        if (!modifiers.matchesPredicate) {
            return null;
        }

        return (
            <MenuItem
                active={modifiers.active}
                icon={this.isRegionSelected(item) ? 'tick' : 'blank'}
                key={item.value}
                onClick={handleClick}
                text={item.label}
                shouldDismissPopover={false}
            />
        );
    }

    render() {
        const clearButton = this.state.regions.length ? <Button icon="cross" minimal onClick={this.handleClear} /> : null;

        return (
            <FlexView className="live-review" column>
                <FlexView vAlignContent="top">
                    <H3>Live Review</H3>
                    
                    <FlexView grow />

                    {this.state.fetching ? (
                        <Button intent={Intent.WARNING} icon="stop" onClick={this.handleStopReviews}>Stop</Button>
                    ) : (
                        <Button intent={Intent.SUCCESS} icon="play" onClick={this.handleGetReviews}>Get reviews</Button>
                    )}
                
                </FlexView>

                <div><hr/></div>
            
                <FlexView vAlignContent="center" wrap marginTop="16px" marginBottom="16px">
                    <FlexView marginRight="16px">
                        <span>Apply for updates in regions:</span>
                    </FlexView>

                    <MultiSelect 
                        noResults={<MenuItem disabled={true} text="No results." />}
                        onItemSelect={this.handleRegionSelect}
                        itemRenderer={this.renderItem}
                        tagRenderer={this.renderTag}
                        tagInputProps={{ onRemove: this.handleTagRemove, rightElement: clearButton }}
                        items={REGION_ITEMS}
                        selectedItems={this.state.regions}
                    />
                </FlexView>

                <ul className="reviews">
                    {this.state.reviews.map(review => (
                        <li key={review.paiId}><ReviewCard 
                            expires={REVIEW_EXPIRES}
                            review={review}
                            handleOpenReview={this.handleOpenReview}
                            handleExpiredReview={this.handleExpiredReview}
                        /></li>
                    ))}
                </ul>

                {this.state.review && 
                    <Review 
                        handleSubmit={this.handleSubmit}
                        handleInputChange={this.handleInputChange}
                        handleRotate={this.handleRotate}
                        handleReviewClose={this.handleCloseReview}
                        rotated={this.state.rotated}
                        review={this.state.review}
                    />
                }
            </FlexView>
        );
    }
}

export default LiveReviewContainer;
