import { combineReducers } from 'redux';

import HomeContainer from './home';
import LiveReviewContainer from './live-review';
import Authentication from './authentication';
import LoginContainer, { LoginReducer } from './login';
import RecoverPasswordContainer from './recover-password';
import ReviewContainer from './review';
import ReviewsContainer, { ReviewsReducer } from './reviews';
import UsersContainer, { UsersReducer } from './users';
import ArticlesContainer from './articles';

export const Containers = {
    HomeContainer,
    LoginContainer,
    RecoverPasswordContainer,
    LiveReviewContainer,
    Authentication,
    ReviewContainer,
    ReviewsContainer,
    UsersContainer,
    ArticlesContainer,
};

export const reducers = combineReducers({
    user: LoginReducer,
    users: UsersReducer,
    reviews: ReviewsReducer,
});
