/**
 * Layout utility functions for filtering props and handling layout-specific logic
 */

// Import layout constants from the main constants file
import { LAYOUT_CONSTANTS } from './constants.js';

/**
 * Filters out layout props that should not be passed to Text components
 * to prevent Ink warnings about unsupported props
 */
export const filterLayoutProps = (props) => {
  const { 
    // Layout props that should be filtered out
    margin, marginX, marginY, marginTop, marginBottom, marginLeft, marginRight,
    padding, paddingX, paddingY, paddingTop, paddingBottom, paddingLeft, paddingRight,
    borderStyle, borderColor, borderDimColor, borderTop, borderBottom, borderLeft, borderRight,
    width, height, minWidth, minHeight, maxWidth, maxHeight,
    flexGrow, flexShrink, flexDirection, alignItems, alignSelf, justifyContent,
    position, top, right, bottom, left,
    // Keep all other props
    ...textProps 
  } = props;
  
  return textProps;
};

/**
 * Extracts layout props from a props object
 * Useful for when you need to apply layout props to Box components
 */
export const extractLayoutProps = (props) => {
  const {
    // Layout props to extract
    margin, marginX, marginY, marginTop, marginBottom, marginLeft, marginRight,
    padding, paddingX, paddingY, paddingTop, paddingBottom, paddingLeft, paddingRight,
    borderStyle, borderColor, borderDimColor, borderTop, borderBottom, borderLeft, borderRight,
    width, height, minWidth, minHeight, maxWidth, maxHeight,
    flexGrow, flexShrink, flexDirection, alignItems, alignSelf, justifyContent,
    position, top, right, bottom, left,
    // Remove non-layout props
    ...nonLayoutProps
  } = props;

  // Return layout props, filtering out undefined values
  const layoutProps = {
    margin, marginX, marginY, marginTop, marginBottom, marginLeft, marginRight,
    padding, paddingX, paddingY, paddingTop, paddingBottom, paddingLeft, paddingRight,
    borderStyle, borderColor, borderDimColor, borderTop, borderBottom, borderLeft, borderRight,
    width, height, minWidth, minHeight, maxWidth, maxHeight,
    flexGrow, flexShrink, flexDirection, alignItems, alignSelf, justifyContent,
    position, top, right, bottom, left
  };

  // Filter out undefined values
  const filteredLayoutProps = Object.fromEntries(
    Object.entries(layoutProps).filter(([_, value]) => value !== undefined)
  );

  return { layoutProps: filteredLayoutProps, otherProps: nonLayoutProps };
};

// Export the LAYOUT_CONSTANTS for backward compatibility
export { LAYOUT_CONSTANTS };