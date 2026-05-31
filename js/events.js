export const EVENTS = {
  LOAD_ENDED: 'loadEnded',
  MAP_SET_CHANGED: 'mapSetChanged',
  CALCULATION_ENDED: 'calculationEnded',
  ON_MAP_CLICK: 'onMapClick',
  ON_MAP_CLICK_DIFF: 'onMapClickDiff',
  RESET: 'reset',
  STEP_LOG: 'stepLog',
  STEP_LOGBOOK: 'stepLogbook',
  MAP: {
    /** object, id, redraw */
    NEW: 'mapNewObject',
    /** id, redraw */
    DELETE: 'mapDeleteObject',
    /** id, func, attr, redraw */
    FUNCTION: 'mapFunctionObject',
    REDRAW: 'mapRedraw',
    REDRAW_COMPLETED: 'mapRedrawCompleted',
    STEP: 'mapStep',
    SHOW_RELATIVE_DATA: 'mapShowRelativeData'
  },
  OVERLAY: {
    /** object, id, redraw */
    NEW: 'overlayNewObject',
    /** id, redraw */
    DELETE: 'overlayDeleteObject',
    /** id, func, attr, redraw */
    FUNCTION: 'overlayFunctionObject',
    REDRAW: 'overlayRedraw',
  },
  LOADING: {
    /** */
    CLOSE: 'loadingClose',
    /** id */
    OPEN: 'loadingOpen',
    /** id, min, max, cur */
    UPDATE: 'loadingUpdate'
  }
}