import React from 'react';
import PropTypes from 'prop-types';

import Widget from 'components/widgets/widget';

const COMPARE_WARNING_LIST = [
  '88aefca0-e25c-4a16-80b3-f2831d2064e4',
  'd654b935-31cd-4971-877e-bf0345c8b49a',
  '636d41ed-620b-4da9-8796-e5783347fc10'
];

const CompareWidgetList = ({
  widgetsActive, items: itemsCount, countries, countryList, filters: propFilters
}) => {
  const items = Array.from(Array(itemsCount));

  return (
    <div className="c-compareitem-widgets">
      {widgetsActive.map(widget => (
        <div key={widget.id} className="c-compareitem-row">
          {items.map((item, i) => {
            const country = countries[i];

            if (!country) {
              return null;
            }

            const filters = Object.assign({}, propFilters, {
              country,
              countryName: ((countryList || []).find(c => c.id === countries[i]) || {}).name
            });

            return (
              <div key={`${widget.id}-${country}`} className="compareitem-column">
                <div className="column small-12">
                  <Widget
                    widget={widget}
                    filters={filters}
                    warning={COMPARE_WARNING_LIST.includes(widget.id)
                        && <p><i>Note: Y-Axis scales could be different between countries</i></p>
                      }
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

CompareWidgetList.propTypes = {
  items: PropTypes.number,
  countries: PropTypes.array,
  countryList: PropTypes.array,
  filters: PropTypes.object,
  widgetsActive: PropTypes.array
};

CompareWidgetList.defaultProps = {
  items: 0,
  countries: [],
  countryList: [],
  filters: {},
  widgetsActive: []
};

export default CompareWidgetList;
