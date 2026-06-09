import React from 'react';
import PropTypes from 'prop-types';

import TableHeaderActions from './TableHeaderActions';

const TableHeader = ({
  actions, columns, columnValues, columnQueries, filteredData, onFilter, onSort
}) => (
  <thead>
    <tr>
      {(actions.showable || actions.editable || actions.removable) && !!filteredData.length
        && <th />
      }
      {columns.map(c => (
        <th key={c.value}>
          <span className="th-wrapper">
            <span>{c.label}</span>

            <TableHeaderActions
              field={c.value}
              values={columnValues[c.value]}
              selected={columnQueries[c.value]}
              onFilter={onFilter}
              onSort={onSort}
            />
          </span>
        </th>
      ))}
    </tr>
  </thead>
);

TableHeader.propTypes = {
  actions: PropTypes.object,
  columns: PropTypes.array,
  columnValues: PropTypes.object,
  columnQueries: PropTypes.object,
  filteredData: PropTypes.array,
  onFilter: PropTypes.func,
  onSort: PropTypes.func
};

TableHeader.defaultProps = {
  actions: {},
  columns: [],
  columnValues: {},
  columnQueries: {},
  filteredData: [],
  onFilter: null,
  onSort: null
};

export default TableHeader;
