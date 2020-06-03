import React from 'react';
import ReactDOM from 'react-dom';
import Scatterplots3D from './Scatterplots3D';

class App extends React.Component {
    constructor() {
        super();
    }
    render() {
        return (
            <div id='mainVisualizationArea'>
                <Scatterplots3D />
            </div>
        );
    }
}
ReactDOM.render(<App/>, document.querySelector('#app'));
