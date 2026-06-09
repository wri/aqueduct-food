import React from 'react';
import { array, string } from 'prop-types';
import classnames from 'classnames';

export default function BtnMenu(props) {
  const { items, className } = props;
  const cNames = classnames('c-btn-menu', {
    [className]: className
  });
  const btnClassNames = item => classnames('btn-menu-btn', {
    '-disabled': item.disabled
  });

  return (
    <ul className={cNames}>
      {items.map(item => (
        <li className={classnames('btn-menu-item', { '-active': item.active })} key={item.label}>
          <button className={btnClassNames(item)} type="button" onClick={() => item.cb && item.cb(item)}>
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

BtnMenu.propTypes = {
  items: array.isRequired,
  className: string
};

BtnMenu.defaultProps = {
  className: ''
};
