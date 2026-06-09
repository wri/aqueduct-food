import React from 'react';
import PropTypes from 'prop-types';
import { Spinner } from 'aqueduct-components';
import Widget from 'components/widgets/widget';

export default class EmbedPage extends React.Component {
  componentWillMount() {
    const { getWidget } = this.props;
    getWidget();
  }

  render() {
    const { error, widget, filters } = this.props;
    return (
      <div className="l-embed">
        {error}
        {!error && <Spinner isLoading={!widget} />}
        {!error && widget && <Widget className="-embed" widget={widget} filters={filters} />}
      </div>
    );
  }
}


EmbedPage.propTypes = {
  filters: PropTypes.object,
  getWidget: PropTypes.func,
  widget: PropTypes.object,
  error: PropTypes.string
};

EmbedPage.defaultProps = {
  filters: {},
  getWidget: () => {},
  widget: null,
  error: null
};
