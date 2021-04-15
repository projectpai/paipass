import React, {Component, Fragment} from 'react';
import {Route} from 'react-router-dom';
import {connect} from 'react-redux';
import qs from 'qs';

import ReviewsReducer from './reducer';
import * as actions from './actions';
import Reviews from './reviews';
import ReviewContainer from '../review';

import {table} from '../../common/constants';

const defaultOrderBy = 'REVIEWER_ID';

class ReviewsContainer extends Component {
    state = {
        errors: {
            paiId: '',
            submitter: ''
        },
        table: {
            orderBy: defaultOrderBy,
            size: table.DEFAULT_PAGE_SIZE,
            page: 1,
            orderDir: table.DESCENDING,
            status: '',
            submitter: '',
        },
        reviews: {data: []},
        reviewers: [],
    };

    constructor(props) {
        super(props);

        this.state.table.email = qs.parse(
            this.props.location.search, {ignoreQueryPrefix: true}
        ).email || '';

        this.handleTableChange = this.handleTableChange.bind(this);
        this.handleEdit = this.handleEdit.bind(this);
    }


    /**
     * Update the table state from the table.
     * @param {*} tableState State object of the table
     */
    handleTableChange(tableState) {
        console.log(tableFilter);
        let tableFilter = {};

        tableState.filtered.forEach(item => {
            if (item.value.target) {
                tableFilter[item.value.target.name] = item.value.target.value;
            } else {
                tableFilter[item.id] = item.value;

            }
        })

        this.setState({
            ...this.state,
            table: {
                ...this.state.table,
                size: tableState.pageSize,
                perPage: tableState.pageSize,
                page: tableState.page + 1,
                orderBy: tableState.sorted.length ? tableState.sorted[0].id : table.DEFAULT_ORDER_BY,
                orderDir: tableState.sorted.length ? (tableState.sorted[0].desc ? table.DESCENDING : table.ASCENDING) : table.DESCENDING,
                submitter: tableState.submitter,
                status: tableState.status,
                ...tableFilter
            }
        }, () => {
            this.loadTableData()
        });
    }

    /**
     * After updating the state in filters just call this to update the table data.
     */
    loadTableData() {
        const {getReviews} = this.props;
        getReviews(this.state.table);
    }

    handleEdit(rowData) {
        this.props.history.push(`/home/reviews/${rowData.uuid}`);
        this.setState({...this.state, showDrawer: true});
    }

    componentWillReceiveProps({reviews, reviewers}) {
        this.setState({...this.state, reviews, reviewers});
    }

    render() {
        const {
            table,
            reviews,
            reviewers,
        } = this.state;

        return (
            <Fragment>
                <Reviews
                    handleTableChange={this.handleTableChange}
                    handleEdit={this.handleEdit}
                    table={table}
                    reviews={reviews}
                    reviewers={reviewers}
                />

                <Route path='/home/reviews/:id' component={ReviewContainer}/>
            </Fragment>
        )
    }
}

const mapStateToProps = ({reviews, reviews: {reviewers}}) => ({reviews, reviewers});

export default connect(mapStateToProps, actions)(ReviewsContainer);
export {ReviewsContainer, ReviewsReducer};
