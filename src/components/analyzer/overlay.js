import React from 'react';
import PropTypes from 'prop-types';
import BtnMenu from 'components/ui/BtnMenu';
import classNames from 'classnames';

const AnalyzerOverlay = ({
  onUploadNew, show, content, children
}) => (
  <div className="c-overlay">
    {children}
    <div className={classNames('content', { show, hide: !show })}>
      <div className="content-box">
        {content}
        <BtnMenu
          className="-theme-white"
          items={[
            {
              label: 'Reupload File',
              cb: onUploadNew,
            }
          ]}
        />
      </div>
    </div>
  </div>
);

AnalyzerOverlay.propTypes = {
  onUploadNew: PropTypes.func,
  show: PropTypes.bool,
  content: PropTypes.node,
  children: PropTypes.node
};

AnalyzerOverlay.defaultProps = {
  onUploadNew: () => {},
  show: false,
  content: null,
  children: null
};

export default AnalyzerOverlay;
