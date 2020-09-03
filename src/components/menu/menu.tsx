// WAI-ARIA: https://www.w3.org/TR/wai-aria-practices-1.2/#menubutton
import * as React from 'react'

import { AsShortcut, PropsOf } from '../../types'
import { match } from '../../utils/match'
import { Transition } from '../transitions/transition'
import { useDisposables } from '../../hooks/use-disposables'
import { useIsoMorphicEffect } from '../../hooks/use-iso-morphic-effect'
import { useId } from '../../hooks/use-id'

enum MenuStates {
  Open,
  Closed,
}

// TODO: This must already exist somewhere, right? 🤔
// Ref: https://www.w3.org/TR/uievents-key/#named-key-attribute-values
enum Key {
  Space = ' ',
  Enter = 'Enter',
  Escape = 'Escape',
  Backspace = 'Backspace',

  ArrowUp = 'ArrowUp',
  ArrowRight = 'ArrowRight',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',

  Home = 'Home',
  End = 'End',

  Tab = 'Tab',
}

type MenuItemDataRef = React.MutableRefObject<{ textValue?: string; disabled: boolean }>

type StateDefinition = {
  menuState: MenuStates
  buttonRef: React.MutableRefObject<{ focus: VoidFunction; id: string } | null>
  itemsRef: React.MutableRefObject<{
    focus: VoidFunction
    id: string
    contains: (node: HTMLElement) => boolean
  } | null>
  items: { id: string; dataRef: MenuItemDataRef }[]
  searchQuery: string
  previousActiveIndex: number | null
  activeItemIndex: number | null
}

enum ActionTypes {
  ToggleMenu,
  OpenMenu,
  CloseMenu,

  GoToItem,
  Search,
  ClearSearch,

  SetButtonRef,
  SetItemsRef,

  RegisterItem,
  UnregisterItem,
}

enum Focus {
  FirstItem,
  PreviousItem,
  NextItem,
  LastItem,
  SpecificItem,
  Nothing,
}

function calculateActiveItemIndex(
  state: StateDefinition,
  focus: Focus,
  id?: string
): StateDefinition['activeItemIndex'] {
  if (state.items.length <= 0) return null

  const items = state.items
  const activeItemIndex = state.activeItemIndex ?? -1

  function ensureValidValue(value: number | null): number | null {
    if (value === -1) return state.activeItemIndex
    return value
  }

  return ensureValidValue(
    match(focus, {
      [Focus.FirstItem]: () => items.findIndex(item => !item.dataRef.current.disabled),
      [Focus.PreviousItem]: () => {
        const idx = items
          .slice()
          .reverse()
          .findIndex((item, idx, all) => {
            if (all.length - idx - 1 >= activeItemIndex) return false
            return !item.dataRef.current.disabled
          })
        if (idx === -1) return idx
        return items.length - 1 - idx
      },
      [Focus.NextItem]: () => {
        return items.findIndex((item, idx) => {
          if (idx <= activeItemIndex) return false
          return !item.dataRef.current.disabled
        })
      },
      [Focus.LastItem]: () => {
        const idx = items
          .slice()
          .reverse()
          .findIndex(item => !item.dataRef.current.disabled)
        if (idx === -1) return idx
        return items.length - 1 - idx
      },
      [Focus.SpecificItem]: () => items.findIndex(item => item.id === id),
      [Focus.Nothing]: () => null,
    })
  )
}

type Actions =
  | { type: ActionTypes.ToggleMenu }
  | { type: ActionTypes.CloseMenu }
  | { type: ActionTypes.OpenMenu }
  | { type: ActionTypes.GoToItem; focus: Focus; id?: string }
  | { type: ActionTypes.Search; value: string }
  | { type: ActionTypes.ClearSearch }
  | { type: ActionTypes.SetButtonRef; buttonRef: StateDefinition['buttonRef'] }
  | { type: ActionTypes.SetItemsRef; itemsRef: StateDefinition['itemsRef'] }
  | { type: ActionTypes.RegisterItem; id: string; dataRef: MenuItemDataRef }
  | { type: ActionTypes.UnregisterItem; id: string }

const reducers: {
  [P in ActionTypes]: (
    state: StateDefinition,
    action: Extract<Actions, { type: P }>
  ) => StateDefinition
} = {
  [ActionTypes.ToggleMenu]: state => ({
    ...state,
    menuState: match(state.menuState, {
      [MenuStates.Open]: MenuStates.Closed,
      [MenuStates.Closed]: MenuStates.Open,
    }),
  }),
  [ActionTypes.CloseMenu]: state => ({ ...state, menuState: MenuStates.Closed }),
  [ActionTypes.OpenMenu]: state => ({ ...state, menuState: MenuStates.Open }),
  [ActionTypes.GoToItem]: (state, action) => {
    const activeItemIndex = calculateActiveItemIndex(state, action.focus, action.id)

    if (
      state.searchQuery === '' &&
      state.previousActiveIndex === state.activeItemIndex &&
      state.activeItemIndex === activeItemIndex
    ) {
      return state
    }

    return {
      ...state,
      searchQuery: '',
      previousActiveIndex: state.activeItemIndex,
      activeItemIndex,
    }
  },
  [ActionTypes.Search]: (state, action) => {
    const searchQuery = state.searchQuery + action.value
    const match = state.items.findIndex(
      item =>
        item.dataRef.current.textValue?.startsWith(searchQuery) && !item.dataRef.current.disabled
    )

    if (match === -1 || match === state.activeItemIndex) {
      return { ...state, searchQuery }
    }

    return {
      ...state,
      searchQuery,
      previousActiveIndex: state.activeItemIndex,
      activeItemIndex: match,
    }
  },
  [ActionTypes.ClearSearch]: state => ({ ...state, searchQuery: '' }),
  [ActionTypes.SetButtonRef]: (state, action) => ({ ...state, buttonRef: action.buttonRef }),
  [ActionTypes.SetItemsRef]: (state, action) => ({ ...state, itemsRef: action.itemsRef }),
  [ActionTypes.RegisterItem]: (state, action) => ({
    ...state,
    items: [...state.items, { id: action.id, dataRef: action.dataRef }],
  }),
  [ActionTypes.UnregisterItem]: (state, action) => {
    const nextItems = state.items.slice()
    const currentActiveItem =
      state.activeItemIndex !== null ? nextItems[state.activeItemIndex] : null

    const idx = nextItems.findIndex(a => a.id === action.id)

    if (idx !== -1) {
      nextItems.splice(idx, 1)
    }

    return {
      ...state,
      items: nextItems,
      previousActiveIndex: state.activeItemIndex,
      activeItemIndex: (() => {
        if (idx === state.activeItemIndex) return null
        if (currentActiveItem === null) return null

        // If we removed the item before the actual active index, then it would be out of sync. To
        // fix this, we will find the correct (new) index position.
        return nextItems.indexOf(currentActiveItem)
      })(),
    }
  },
}

const MenuContext = React.createContext<[StateDefinition, React.Dispatch<Actions>] | null>(null)

function useMenuContext(component: string) {
  const context = React.useContext(MenuContext)
  if (context === null) {
    const err = new Error(`<${component} /> is missing a parent <${Menu.name} /> component.`)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(err, useMenuContext)
    }
    throw err
  }
  return context
}

const defaultState: StateDefinition = {
  menuState: MenuStates.Closed,
  buttonRef: { current: null },
  itemsRef: { current: null },
  items: [],
  searchQuery: '',
  previousActiveIndex: null,
  activeItemIndex: null,
}

function stateReducer(state: StateDefinition, action: Actions) {
  return match(action.type, reducers, state, action)
}

export function Menu(props: PropsOf<'div'>) {
  const reducerBag = React.useReducer(stateReducer, defaultState)
  const [{ menuState, itemsRef }, dispatch] = reducerBag

  React.useEffect(() => {
    function handler(event: PointerEvent) {
      if (event.defaultPrevented) return
      if (menuState !== MenuStates.Open) return

      if (!itemsRef.current?.contains(event.target as HTMLElement)) {
        dispatch({ type: ActionTypes.CloseMenu })
      }
    }

    window.addEventListener('pointerdown', handler)
    return () => window.removeEventListener('pointerdown', handler)
  }, [menuState, itemsRef, dispatch])

  return (
    <MenuContext.Provider value={reducerBag}>
      <div {...props} />
    </MenuContext.Provider>
  )
}

// ---

type ButtonPropsWeControl =
  | 'aria-controls'
  | 'aria-expanded'
  | 'aria-haspopup'
  | 'id'
  | 'onKeyDown'
  | 'onMouseDown'
  | 'type'

function Button(props: Omit<PropsOf<'button'>, ButtonPropsWeControl>) {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)

  const [state, dispatch] = useMenuContext([Menu.name, Button.name].join('.'))
  const id = `tailwindui-menu-button-${useId()}`
  const d = useDisposables()
  const { itemsRef } = state

  useIsoMorphicEffect(() => {
    dispatch({ type: ActionTypes.SetButtonRef, buttonRef })
  }, [buttonRef])

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      // Ref: https://www.w3.org/TR/wai-aria-practices-1.2/#keyboard-interaction-13

      // Enter: opens the menu and places focus on the first menu item.
      // Space: opens the menu and places focus on the first menu item.
      // (Optional) Down Arrow: opens the menu and moves focus to the first menu item.
      case Key.Space:
      case Key.Enter:
      case Key.ArrowDown:
        event.preventDefault()
        dispatch({ type: ActionTypes.OpenMenu })
        d.nextFrame(() => {
          itemsRef.current?.focus()
          dispatch({ type: ActionTypes.GoToItem, focus: Focus.FirstItem })
        })
        break

      // (Optional) Up Arrow: opens the menu and moves focus to the last menu item.
      case Key.ArrowUp:
        dispatch({ type: ActionTypes.OpenMenu })
        d.nextFrame(() => {
          itemsRef.current?.focus()
          dispatch({ type: ActionTypes.GoToItem, focus: Focus.LastItem })
        })
        break
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    // We have a `pointerdown` event listener in the menu for the 'outside click', so we just want
    // to prevent going there if we happen to click this button.
    event.preventDefault()
  }

  function handlePointerUp() {
    dispatch({ type: ActionTypes.ToggleMenu })
    d.nextFrame(() => itemsRef.current?.focus())
  }

  function handleFocus() {
    if (state.menuState === MenuStates.Open) itemsRef.current?.focus()
  }

  return (
    <button
      {...props}
      ref={buttonRef}
      type="button"
      id={id}
      aria-haspopup={true}
      aria-controls={state.itemsRef.current?.id}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onPointerUp={handlePointerUp}
      onPointerDown={handlePointerDown}
      aria-expanded={state.menuState === MenuStates.Open ? true : undefined}
    />
  )
}

// ---

type ItemsPropsWeControl =
  | 'aria-activedescendant'
  | 'aria-labelledby'
  | 'id'
  | 'onKeyDown'
  | 'ref'
  | 'role'
  | 'tabIndex'

function Items(props: Omit<PropsOf<'div'>, ItemsPropsWeControl>) {
  const itemsRef = React.useRef<HTMLDivElement | null>(null)

  const [state, dispatch] = useMenuContext([Menu.name, Items.name].join('.'))
  const id = `tailwindui-menu-items-${useId()}`
  const d = useDisposables()
  const searchDisposables = useDisposables()

  useIsoMorphicEffect(() => dispatch({ type: ActionTypes.SetItemsRef, itemsRef }), [itemsRef])

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    searchDisposables.dispose()

    switch (event.key) {
      // Ref: https://www.w3.org/TR/wai-aria-practices-1.2/#keyboard-interaction-12

      case Key.Enter:
        // When focus is on a menuitem that has a submenu, opens the submenu and places focus on its first item.

        // Otherwise, activates the item and closes the menu.
        dispatch({ type: ActionTypes.CloseMenu })
        if (state.activeItemIndex !== null) {
          const { id } = state.items[state.activeItemIndex]
          d.nextFrame(() => document.getElementById(id)?.click())
        }
        break

      // (Optional): When focus is on a menuitemcheckbox, changes the state without closing the menu.
      // (Optional): When focus is on a menuitemradio that is not checked, without closing the menu, checks the focused menuitemradio and unchecks any other checked menuitemradio element in the same group.
      // (Optional): When focus is on a menuitem that has a submenu, opens the submenu and places focus on its first item.
      // (Optional): When focus is on a menuitem that does not have a submenu, activates the menuitem and closes the menu.
      case Key.Space:
        break

      // When focus is on a menuitem in a menubar, opens its submenu and places focus on the first item in the submenu.
      // When focus is in a menu, moves focus to the next item, optionally wrapping from the last to the first.
      case Key.ArrowDown:
        dispatch({ type: ActionTypes.GoToItem, focus: Focus.NextItem })
        break

      // When focus is in a menu, moves focus to the previous item, optionally wrapping from the first to the last.
      // (Optional): When focus is on a menuitem in a menubar, opens its submenu and places focus on the last item in the submenu.
      case Key.ArrowUp:
        dispatch({ type: ActionTypes.GoToItem, focus: Focus.PreviousItem })
        break

      // When focus is in a menubar, moves focus to the next item, optionally wrapping from the last to the first.
      // When focus is in a menu and on a menuitem that has a submenu, opens the submenu and places focus on its first item.
      // When focus is in a menu and on an item that does not have a submenu, performs the following 3 actions:
      //    1. Closes the submenu and any parent menus.
      //    2. Moves focus to the next menuitem in the menubar.
      //    3. Either: (Recommended) opens the submenu of that menuitem without moving focus into the submenu, or opens the submenu of that menuitem and places focus on the first item in the submenu.
      // Note that if the menubar were not present, e.g., the menus were opened from a menubutton, Right Arrow would not do anything when focus is on an item that does not have a submenu.
      case Key.ArrowRight:
        break

      // When focus is in a menubar, moves focus to the previous item, optionally wrapping from the first to the last.
      // When focus is in a submenu of an item in a menu, closes the submenu and returns focus to the parent menuitem.
      // When focus is in a submenu of an item in a menubar, performs the following 3 actions:
      //    1. Closes the submenu.
      //    2. Moves focus to the previous menuitem in the menubar.
      //    3. Either: (Recommended) opens the submenu of that menuitem without moving focus into the submenu, or opens the submenu of that menuitem and places focus on the first item in the submenu.
      case Key.ArrowLeft:
        break

      // If arrow key wrapping is not supported, moves focus to the first item in the current menu or menubar.
      case Key.Home:
        dispatch({ type: ActionTypes.GoToItem, focus: Focus.FirstItem })
        break

      // If arrow key wrapping is not supported, moves focus to the last item in the current menu or menubar.
      case Key.End:
        dispatch({ type: ActionTypes.GoToItem, focus: Focus.LastItem })
        break

      // Close the menu that contains focus and return focus to the element or context, e.g., menu button or parent menuitem, from which the menu was opened.
      case Key.Escape:
        dispatch({ type: ActionTypes.CloseMenu })
        d.nextFrame(() => state.buttonRef.current?.focus())
        break

      case Key.Tab:
        if (event.shiftKey) {
          // Shift + Tab: Moves focus to the previous element in the tab sequence, and if the item that had focus is not in a menubar, closes its menu and all open parent menu containers.
          dispatch({ type: ActionTypes.CloseMenu })
          break
        }

        // Moves focus to the next element in the tab sequence, and if the item that had focus is not in a menubar, closes its menu and all open parent menu containers.
        dispatch({ type: ActionTypes.CloseMenu })
        break

      // Any key that corresponds to a printable character (Optional): Move focus to the next menu item in the current menu whose label begins with that printable character.
      default:
        if (event.key.length === 1) {
          dispatch({ type: ActionTypes.Search, value: event.key })
          searchDisposables.setTimeout(() => dispatch({ type: ActionTypes.ClearSearch }), 350)
        }
        break
    }
  }

  return (
    <Transition show={state.menuState === MenuStates.Open}>
      {ref => (
        <div
          {...props}
          aria-activedescendant={
            state.activeItemIndex === null ? undefined : state.items[state.activeItemIndex]?.id
          }
          aria-labelledby={state.buttonRef.current?.id}
          id={id}
          onKeyDown={handleKeyDown}
          ref={divRef => {
            ref.current = divRef
            itemsRef.current = divRef
          }}
          role="menu"
          tabIndex={0}
        />
      )}
    </Transition>
  )
}

// ---

const DEFAULT_ITEM_TAG = 'a'

type MenuItemPropsWeControl = 'aria-disabled' | 'id' | 'role' | 'tabIndex'

function Item<TTag extends React.ElementType = typeof DEFAULT_ITEM_TAG>(
  props: Omit<AsShortcut<TTag>, MenuItemPropsWeControl | 'className'> & {
    disabled?: boolean
    as?: TTag

    // Special treatment, can either be a string or a function that resolves to a string
    className?: ((bag: { active: boolean; disabled: boolean }) => string) | string
  }
) {
  const { as: Component = DEFAULT_ITEM_TAG, disabled = false, className, ...rest } = props
  const [state, dispatch] = useMenuContext([Menu.name, Item.name].join('.'))
  const id = `tailwindui-menu-item-${useId()}`
  const active =
    state.activeItemIndex !== null ? state.items[state.activeItemIndex].id === id : false

  const bag = React.useRef<MenuItemDataRef['current']>({ disabled: disabled })

  useIsoMorphicEffect(() => {
    bag.current.disabled = disabled
  }, [bag, disabled])

  useIsoMorphicEffect(() => {
    bag.current.textValue = document.getElementById(id)?.textContent?.toLowerCase() ?? undefined
  }, [bag, id])

  useIsoMorphicEffect(() => {
    dispatch({ type: ActionTypes.RegisterItem, id, dataRef: bag })
    return () => dispatch({ type: ActionTypes.UnregisterItem, id })
  }, [bag, id])

  const handlePointerEnter = React.useCallback(() => {
    if (disabled) return
    dispatch({ type: ActionTypes.GoToItem, focus: Focus.SpecificItem, id })
  }, [disabled, id, dispatch])

  const handlePointerLeave = React.useCallback(() => {
    if (disabled) return
    dispatch({ type: ActionTypes.GoToItem, focus: Focus.Nothing })
  }, [disabled, dispatch])

  const handlePointerUp = React.useCallback(() => {
    dispatch({ type: ActionTypes.CloseMenu })
  }, [dispatch])

  const propsBag = React.useMemo(() => ({ active, disabled }), [active, disabled])

  return (
    <Component
      {...rest}
      className={resolvePropValue(className, propsBag)}
      id={id}
      disabled={disabled}
      aria-disabled={disabled}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      role="menuitem"
      tabIndex={-1}
    />
  )
}

function resolvePropValue<TProperty, TBag>(property: TProperty, bag: TBag) {
  if (property === undefined) return undefined
  if (typeof property === 'function') return property(bag)
  return property
}

// ---

Menu.Button = Button
Menu.Items = Items
Menu.Item = Item
