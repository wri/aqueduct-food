import React from 'react';
import PropTypes from 'prop-types';
import TableFilters from './TableFilters';
import TableSorts from './TableSorts';

const TableHeaderActions = props => (
  <div className="c-table-header-actions">
    <ul>
      <li>
        <TableSorts {...props} />
      </li>
      <li>
        <TableFilters {...props} />
      </li>
    </ul>
  </div>
);

TableHeaderActions.propTypes = {
  field: PropTypes.string.isRequired,
  values: PropTypes.array,
  selected: PropTypes.array,
  onFilter: PropTypes.func,
  onSort: PropTypes.func
};

TableHeaderActions.defaultProps = {
  values: [],
  selected: null,
  onFilter: null,
  onSort: null
};

export default TableHeaderActions;
