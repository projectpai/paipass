import React, { Component } from 'react';

import Article from './article';
import { DataManager } from '../../common';
import { table } from '../../common/constants';

class ArticlesContainer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            table: {
                full: true,
                page: 0,
                pageSize: table.DEFAULT_PAGE_SIZE,
                orderBy: 'lastUpdated',
                orderType: table.ASCENDING,
                language: undefined,
            },
            articles: { 
                data: [],
                pages: 0,
                fetching: false,
            },
        };

        this.handleChangeSelect = this.handleChangeSelect.bind(this);
        this.handleTableChange = this.handleTableChange.bind(this);
        this.handlePublishStatusChange = this.handlePublishStatusChange.bind(this);
    }

    componentDidMount() {
       this._isMounted = true; 
    }

    componentWillUnmount() {
        this._isMounted = false;
    }
    
    handlePublishStatusChange(article) {
        this.setState({ ...this.state, 
            articles: { 
                ...this.state.articles, 
                fetching: true 
            } 
        }, () => {
            togglePublishStatus(article.id, article.approved).then(data => {
                this.loadTableData();
            });
        });
    }

    handleTableChange(tableState) {
        this.setState({ ...this.state, 
            table: { 
                ...this.state.table,
                page: tableState.page,
                pageSize: tableState.pageSize,
                orderBy: tableState.sorted.length ? tableState.sorted[0].id : 'lastUpdated',
                orderType: tableState.sorted.length ? (tableState.sorted[0].desc ? table.DESCENDING : table.ASCENDING) : table.ASCENDING,
            },
            articles: {
                fetching: true,
            }}, this.loadTableData
        );
    }

    handleChangeSelect(name, value) {
        this.setState({ ...this.state, 
            table: { ...this.state.table, [name]: value },
            articles: { fetching: true }
            }, this.loadTableData
        );
    }

    loadTableData() {
        getArticles(this.state.table).then((data) => {
            if (this._isMounted) {
                this.setState({ articles: 
                    { ...this.state.articles, 
                      ...data
                    } 
                });
            }
        });
    }

    render() {
        return (
            <Article 
                {...this.state}
                handleTableChange={this.handleTableChange}
                handlePublishStatusChange={this.handlePublishStatusChange}
                handleChangeSelect={this.handleChangeSelect}
            />
        )
    }
}

function getArticles(params) {
    return DataManager.instance.get('/paicoin/getnews', { params })
        .then(({ data }) => {
            return {
                pages: Math.ceil(data.filteredArticleNumber / params.pageSize),
                data: data.paiArticles,
                fetching: false
            };
        });
}

function togglePublishStatus(articleId, published) {
    if (published) {
        return DataManager.instance.post(`/paicoin/updatenews/${articleId}/reject`, {})
        .then(({ data }) => {
            return {
                data: data,
                fetching: true
            };
        });
    } else {
        return DataManager.instance.post(`/paicoin/updatenews/${articleId}/approve`, {})
        .then(({ data }) => {
            return {
                data: data,
                fetching: true
            };
        });
    }
}

export default ArticlesContainer;
