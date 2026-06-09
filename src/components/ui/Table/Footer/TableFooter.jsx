import React from 'react';
import PropTypes from 'prop-types';

export default class TableFooter extends React.Component {
  constructor(props) {
    super(props);

    // BINDINGS
    this.onPrevPage = this.onPrevPage.bind(this);
    this.onNextPage = this.onNextPage.bind(this);
  }

  onNextPage() {
    const { pagination, onChangePage } = this.props;
    if (pagination.page === pagination.total - 1) return;
    if (onChangePage) onChangePage(pagination.page + 1);
  }

  onPrevPage() {
    const { pagination, onChangePage } = this.props;
    if (pagination.page === 0) return;
    if (onChangePage) onChangePage(pagination.page - 1);
  }

  render() {
    const { pagination } = this.props;
    return (
      <div className="table-footer">
        {/* Paginator */}
        {pagination.enabled
          && (
          <ul className="paginator">
            <li className="paginator-link">
              <button type="button" className="paginator-btn" onClick={this.onPrevPage}>
                Prev
              </button>
            </li>
            <li className="paginator-link">
              <button type="button" className="paginator-btn" onClick={this.onNextPage}>
                Next
              </button>
            </li>
          </ul>
          )
        }

        {/* Page locator */}
        {pagination.enabled
          && <span>Page <span>{pagination.page + 1}</span> of <span>{pagination.total}</span></span>
        }
      </div>
    );
  }
}

TableFooter.propTypes = {
  pagination: PropTypes.object,
  onChangePage: PropTypes.func
};

TableFooter.defaultProps = {
  pagination: {
    enabled: true,
    pageSize: 20,
    page: 0,
    total: null
  },
  onChangePage: null
};
