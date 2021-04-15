import React, { Component, Fragment } from 'react';
import FlexView from 'react-flexview';
import { ProgressBar } from '@blueprintjs/core'; 

class Timer extends Component {
    state = { progress: 0 };
    
    componentWillMount() {
        const { startTime = new Date().getTime(), endTime, onFinish } = this.props;

        if (endTime) {
            this.interval = setInterval(() => {
                if (this.state.progress >= 1) { 
                    clearInterval(this.interval);
                    if (typeof onFinish === 'function') {
                        setTimeout(() => {
                            onFinish(); 
                        }, 0);
                    }
                }  

                this.setState({
                    progress: (new Date().getTime() - startTime) / (endTime - startTime)
                })
            }, 300);
        }
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    render() {
        const { progress } = this.state;

        return (
            <Fragment>
                <FlexView width="104px">
                    <span>Time remaining</span>
                </FlexView>
                
                <FlexView grow marginRight="8px"> 
                    <ProgressBar
                        intent={progress < .5 ? 'success' : 'warning'}
                        animate={false}
                        stripes={false}
                        value={1 - progress}
                    />
                </FlexView>                        
            </Fragment> 
        )
    }
}

export default Timer;
