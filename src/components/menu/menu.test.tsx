import React from 'react'
import { render } from '@testing-library/react'

import { Menu } from './menu'
import { suppressConsoleLogs } from '../../test-utils/suppress-console-logs'
import {
  MenuButtonState,
  MenuState,
  assertMenu,
  assertMenuButton,
  assertMenuButtonLinkedWithMenu,
  assertMenuItem,
  assertMenuLinkedWithMenuItem,
  assertActiveElement,
  assertNoActiveMenuItem,
} from '../../test-utils/accessibility-assertions'
import { click, press, hover, unHover, type, word, Keys } from '../../test-utils/interactions'

function getMenuButton(): HTMLElement | null {
  // This is just an assumption for our tests. We assume that we only have 1 button. And if we have
  // more, than we assume that it is the first one.
  return document.querySelector('button')
}

function getMenu(): HTMLElement | null {
  // This is just an assumption for our tests. We assume that our menu has this role and that it is
  // the first item in the DOM.
  return document.querySelector('[role="menu"]')
}

function getMenuItems(): HTMLElement[] {
  // This is just an assumption for our tests. We assume that all menu items have this role.
  return Array.from(document.querySelectorAll('[role="menuitem"]'))
}

describe('safe guards', () => {
  it(
    'should error when we are using a <Menu.Button /> without a parent <Menu />',
    suppressConsoleLogs(() => {
      expect(() => render(<Menu.Button>...</Menu.Button>)).toThrowErrorMatchingInlineSnapshot(
        `"<Menu.Button /> is missing a parent <Menu /> component."`
      )
    })
  )

  it(
    'should error when we are using a <Menu.Items /> without a parent <Menu />',
    suppressConsoleLogs(() => {
      expect(() => render(<Menu.Items>...</Menu.Items>)).toThrowErrorMatchingInlineSnapshot(
        `"<Menu.Items /> is missing a parent <Menu /> component."`
      )
    })
  )

  it(
    'should error when we are using a <Menu.Item /> without a parent <Menu />',
    suppressConsoleLogs(() => {
      expect(() => render(<Menu.Item>...</Menu.Item>)).toThrowErrorMatchingInlineSnapshot(
        `"<Menu.Item /> is missing a parent <Menu /> component."`
      )
    })
  )

  it(
    'should be possible to render a menu without crashing',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>Item A</Menu.Item>
            <Menu.Item>Item B</Menu.Item>
            <Menu.Item>Item C</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      assertMenuButton(getMenuButton(), {
        state: MenuButtonState.Closed,
        attributes: { id: 'tailwindui-menu-button-1' },
      })
      assertMenu(getMenu(), { state: MenuState.Closed })
    })
  )
})

describe('rendering composition', () => {
  it(
    'should be possible to conditionally render classNames (aka className can be a function?!)',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item className={bag => JSON.stringify(bag)}>Item A</Menu.Item>
            <Menu.Item disabled className={bag => JSON.stringify(bag)}>
              Item B
            </Menu.Item>
            <Menu.Item className="no-special-treatment">Item C</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      assertMenuButton(getMenuButton(), {
        state: MenuButtonState.Closed,
        attributes: { id: 'tailwindui-menu-button-1' },
      })
      assertMenu(getMenu(), { state: MenuState.Closed })

      // Open menu
      await click(getMenuButton())

      const items = getMenuItems()

      // Verify correct classNames
      expect('' + items[0].classList).toEqual(JSON.stringify({ active: false, disabled: false }))
      expect('' + items[1].classList).toEqual(JSON.stringify({ active: false, disabled: true }))
      expect('' + items[2].classList).toEqual('no-special-treatment')

      // Double check that nothing is active
      assertNoActiveMenuItem(getMenu())

      // Make the first item active
      await press(Keys.ArrowDown)

      // Verify the classNames
      expect('' + items[0].classList).toEqual(JSON.stringify({ active: true, disabled: false }))
      expect('' + items[1].classList).toEqual(JSON.stringify({ active: false, disabled: true }))
      expect('' + items[2].classList).toEqual('no-special-treatment')

      // Double check that the first item is the active one
      assertMenuLinkedWithMenuItem(getMenu(), items[0])

      // Let's go down, this should go to the third item since the second item is disabled!
      await press(Keys.ArrowDown)

      // Verify the classNames
      expect('' + items[0].classList).toEqual(JSON.stringify({ active: false, disabled: false }))
      expect('' + items[1].classList).toEqual(JSON.stringify({ active: false, disabled: true }))
      expect('' + items[2].classList).toEqual('no-special-treatment')

      // Double check that the last item is the active one
      assertMenuLinkedWithMenuItem(getMenu(), items[2])
    })
  )

  it(
    'should be possible to swap the menu item with a button for example',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item as="button">Item A</Menu.Item>
            <Menu.Item as="button">Item B</Menu.Item>
            <Menu.Item as="button">Item C</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      assertMenuButton(getMenuButton(), {
        state: MenuButtonState.Closed,
        attributes: { id: 'tailwindui-menu-button-1' },
      })
      assertMenu(getMenu(), { state: MenuState.Closed })

      // Open menu
      await click(getMenuButton())

      // Verify items are buttons now
      const items = getMenuItems()
      items.forEach(item => assertMenuItem(item, { tag: 'button' }))
    })
  )
})

describe('keyboard interactions', () => {
  describe('`Enter` key', () => {
    it(
      'should be possible to open the menu with Enter',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        // Verify it is open
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })
        assertMenu(getMenu(), {
          state: MenuState.Open,
          attributes: { id: 'tailwindui-menu-items-2' },
        })
        assertMenuButtonLinkedWithMenu(getMenuButton(), getMenu())

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))

        // Verify that the first menu item is active
        assertMenuLinkedWithMenuItem(getMenu(), items[0])
      })
    )

    it(
      'should have no active menu item when there are no menu items at all',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items />
          </Menu>
        )

        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)
        assertMenu(getMenu(), { state: MenuState.Open })

        assertNoActiveMenuItem(getMenu())
      })
    )

    it(
      'should focus the first non disabled menu item when opening with Enter',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        const items = getMenuItems()

        // Verify that the first non-disabled menu item is active
        assertMenuLinkedWithMenuItem(getMenu(), items[1])
      })
    )

    it(
      'should focus the first non disabled menu item when opening with Enter (jump over multiple disabled ones)',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        const items = getMenuItems()

        // Verify that the first non-disabled menu item is active
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )

    it(
      'should have no active menu item upon Enter key press, when there are no non-disabled menu items',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item disabled>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        assertNoActiveMenuItem(getMenu())
      })
    )

    it(
      'should be possible to close the menu with Enter when there is no active menuitem',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Open menu
        await click(getMenuButton())

        // Verify it is open
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })

        // Close menu
        await press(Keys.Enter)

        // Verify it is closed
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Closed })
        assertMenu(getMenu(), { state: MenuState.Closed })
      })
    )

    it(
      'should be possible to close the menu with Enter and invoke the active menu item',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Open menu
        await click(getMenuButton())

        // Verify it is open
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })

        // Activate the first menu item
        const items = getMenuItems()
        await hover(items[0])

        // Close menu, and invoke the item
        await press(Keys.Enter)

        // Verify it is closed
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Closed })
        assertMenu(getMenu(), { state: MenuState.Closed })
      })
    )
  })

  describe('`Space` key', () => {
    it(
      'should be possible to open the menu with Space',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Space)

        // Verify it is open
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })
        assertMenu(getMenu(), {
          state: MenuState.Open,
          attributes: { id: 'tailwindui-menu-items-2' },
        })
        assertMenuButtonLinkedWithMenu(getMenuButton(), getMenu())

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))
        assertMenuLinkedWithMenuItem(getMenu(), items[0])
      })
    )

    it(
      'should have no active menu item when there are no menu items at all',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items />
          </Menu>
        )

        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Space)
        assertMenu(getMenu(), { state: MenuState.Open })

        assertNoActiveMenuItem(getMenu())
      })
    )

    it(
      'should focus the first non disabled menu item when opening with Space',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Space)

        const items = getMenuItems()

        // Verify that the first non-disabled menu item is active
        assertMenuLinkedWithMenuItem(getMenu(), items[1])
      })
    )

    it(
      'should focus the first non disabled menu item when opening with Space (jump over multiple disabled ones)',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Space)

        const items = getMenuItems()

        // Verify that the first non-disabled menu item is active
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )

    it(
      'should have no active menu item upon Space key press, when there are no non-disabled menu items',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item disabled>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Space)

        assertNoActiveMenuItem(getMenu())
      })
    )
  })

  describe('`Escape` key', () => {
    it(
      'should be possible to close an open menu with Escape',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Space)

        // Verify it is open
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })
        assertMenu(getMenu(), {
          state: MenuState.Open,
          attributes: { id: 'tailwindui-menu-items-2' },
        })
        assertMenuButtonLinkedWithMenu(getMenuButton(), getMenu())

        // Close menu
        await press(Keys.Escape)

        // Verify it is closed
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Closed })
        assertMenu(getMenu(), { state: MenuState.Closed })
      })
    )
  })

  describe('`Tab` key', () => {
    it(
      'should be possible to open the menu with Enter and close it with Tab',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        // Verify it is open
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })
        assertMenu(getMenu(), {
          state: MenuState.Open,
          attributes: { id: 'tailwindui-menu-items-2' },
        })
        assertMenuButtonLinkedWithMenu(getMenuButton(), getMenu())

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))
        assertMenuLinkedWithMenuItem(getMenu(), items[0])

        // Close menu
        await press(Keys.Tab)

        // Verify it is closed
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Closed })
        assertMenu(getMenu(), { state: MenuState.Closed })
      })
    )

    it(
      'should be possible to open the menu with Enter and close it with Shift+Tab',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        // Verify it is open
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })
        assertMenu(getMenu(), {
          state: MenuState.Open,
          attributes: { id: 'tailwindui-menu-items-2' },
        })
        assertMenuButtonLinkedWithMenu(getMenuButton(), getMenu())

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))
        assertMenuLinkedWithMenuItem(getMenu(), items[0])

        // Close menu
        await press(Keys.ShiftTab)

        // Verify it is closed
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Closed })
        assertMenu(getMenu(), { state: MenuState.Closed })
      })
    )
  })

  describe('`ArrowDown` key', () => {
    it(
      'should be possible to open the menu with ArrowDown',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.ArrowDown)

        // Verify it is open
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })
        assertMenu(getMenu(), {
          state: MenuState.Open,
          attributes: { id: 'tailwindui-menu-items-2' },
        })
        assertMenuButtonLinkedWithMenu(getMenuButton(), getMenu())

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))

        // Verify that the first menu item is active
        assertMenuLinkedWithMenuItem(getMenu(), items[0])
      })
    )

    it(
      'should have no active menu item when there are no menu items at all',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items />
          </Menu>
        )

        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.ArrowDown)
        assertMenu(getMenu(), { state: MenuState.Open })

        assertNoActiveMenuItem(getMenu())
      })
    )

    it(
      'should be possible to use ArrowDown to navigate the menu items',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))
        assertMenuLinkedWithMenuItem(getMenu(), items[0])

        // We should be able to go down once
        await press(Keys.ArrowDown)
        assertMenuLinkedWithMenuItem(getMenu(), items[1])

        // We should be able to go down again
        await press(Keys.ArrowDown)
        assertMenuLinkedWithMenuItem(getMenu(), items[2])

        // We should NOT be able to go down again (because last item). Current implementation won't go around.
        await press(Keys.ArrowDown)
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )

    it(
      'should be possible to use ArrowDown to navigate the menu items and skip the first disabled one',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))
        assertMenuLinkedWithMenuItem(getMenu(), items[1])

        // We should be able to go down once
        await press(Keys.ArrowDown)
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )

    it(
      'should be possible to use ArrowDown to navigate the menu items and jump to the first non-disabled one',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )
  })

  describe('`ArrowUp` key', () => {
    it(
      'should be possible to open the menu with ArrowUp and the last item should be active',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.ArrowUp)

        // Verify it is open
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })
        assertMenu(getMenu(), {
          state: MenuState.Open,
          attributes: { id: 'tailwindui-menu-items-2' },
        })
        assertMenuButtonLinkedWithMenu(getMenuButton(), getMenu())

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))

        // ! ALERT: The LAST item should now be active
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )

    it(
      'should have no active menu item when there are no menu items at all',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items />
          </Menu>
        )

        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.ArrowUp)
        assertMenu(getMenu(), { state: MenuState.Open })

        assertNoActiveMenuItem(getMenu())
      })
    )

    it(
      'should be possible to use ArrowUp to navigate the menu items and jump to the first non-disabled one',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item disabled>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.ArrowUp)

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))
        assertMenuLinkedWithMenuItem(getMenu(), items[0])
      })
    )

    it(
      'should not be possible to navigate up or down if there is only a single non-disabled item',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))
        assertMenuLinkedWithMenuItem(getMenu(), items[2])

        // We should not be able to go up (because those are disabled)
        await press(Keys.ArrowUp)
        assertMenuLinkedWithMenuItem(getMenu(), items[2])

        // We should not be able to go down (because this is the last item)
        await press(Keys.ArrowDown)
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )

    it(
      'should be possible to use ArrowUp to navigate the menu items',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        assertMenuButton(getMenuButton(), {
          state: MenuButtonState.Closed,
          attributes: { id: 'tailwindui-menu-button-1' },
        })
        assertMenu(getMenu(), { state: MenuState.Closed })

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.ArrowUp)

        // Verify it is open
        assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })
        assertMenu(getMenu(), {
          state: MenuState.Open,
          attributes: { id: 'tailwindui-menu-items-2' },
        })
        assertMenuButtonLinkedWithMenu(getMenuButton(), getMenu())

        // Verify we have menu items
        const items = getMenuItems()
        expect(items).toHaveLength(3)
        items.forEach(item => assertMenuItem(item))
        assertMenuLinkedWithMenuItem(getMenu(), items[2])

        // We should be able to go down once
        await press(Keys.ArrowUp)
        assertMenuLinkedWithMenuItem(getMenu(), items[1])

        // We should be able to go down again
        await press(Keys.ArrowUp)
        assertMenuLinkedWithMenuItem(getMenu(), items[0])

        // We should NOT be able to go up again (because first item). Current implementation won't go around.
        await press(Keys.ArrowUp)
        assertMenuLinkedWithMenuItem(getMenu(), items[0])
      })
    )
  })

  describe('`End` key', () => {
    it(
      'should be possible to use the End key to go to the last menu item',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        const items = getMenuItems()

        // We should be on the first item
        assertMenuLinkedWithMenuItem(getMenu(), items[0])

        // We should be able to go to the last item
        await press(Keys.End)
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )

    it(
      'should be possible to use the End key to go to the last non disabled menu item',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item disabled>Item C</Menu.Item>
              <Menu.Item disabled>Item D</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.Enter)

        const items = getMenuItems()

        // We should be on the first item
        assertMenuLinkedWithMenuItem(getMenu(), items[0])

        // We should be able to go to the last non-disabled item
        await press(Keys.End)
        assertMenuLinkedWithMenuItem(getMenu(), items[1])
      })
    )

    it(
      'should be possible to use the End key to go to the first menu item if that is the only non-disabled menu item',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item disabled>Item C</Menu.Item>
              <Menu.Item disabled>Item D</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Open menu
        await click(getMenuButton())

        // We opened via click, we don't have an active item
        assertNoActiveMenuItem(getMenu())

        // We should not be able to go to the end
        await press(Keys.End)

        const items = getMenuItems()
        assertMenuLinkedWithMenuItem(getMenu(), items[0])
      })
    )

    it(
      'should have no active menu item upon End key press, when there are no non-disabled menu items',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item disabled>Item C</Menu.Item>
              <Menu.Item disabled>Item D</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Open menu
        await click(getMenuButton())

        // We opened via click, we don't have an active item
        assertNoActiveMenuItem(getMenu())

        // We should not be able to go to the end
        await press(Keys.End)

        assertNoActiveMenuItem(getMenu())
      })
    )
  })

  describe('`Home` key', () => {
    it(
      'should be possible to use the Home key to go to the first menu item',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>Item A</Menu.Item>
              <Menu.Item>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.ArrowUp)

        const items = getMenuItems()

        // We should be on the last item
        assertMenuLinkedWithMenuItem(getMenu(), items[2])

        // We should be able to go to the first item
        await press(Keys.Home)
        assertMenuLinkedWithMenuItem(getMenu(), items[0])
      })
    )

    it(
      'should be possible to use the Home key to go to the first non disabled menu item',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item>Item C</Menu.Item>
              <Menu.Item>Item D</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Open menu
        await click(getMenuButton())

        // We opened via click, we don't have an active item
        assertNoActiveMenuItem(getMenu())

        // We should not be able to go to the end
        await press(Keys.Home)

        const items = getMenuItems()

        // We should be on the first non-disabled item
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )

    it(
      'should be possible to use the Home key to go to the last menu item if that is the only non-disabled menu item',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item disabled>Item C</Menu.Item>
              <Menu.Item>Item D</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Open menu
        await click(getMenuButton())

        // We opened via click, we don't have an active item
        assertNoActiveMenuItem(getMenu())

        // We should not be able to go to the end
        await press(Keys.Home)

        const items = getMenuItems()
        assertMenuLinkedWithMenuItem(getMenu(), items[3])
      })
    )

    it(
      'should have no active menu item upon Home key press, when there are no non-disabled menu items',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item disabled>Item A</Menu.Item>
              <Menu.Item disabled>Item B</Menu.Item>
              <Menu.Item disabled>Item C</Menu.Item>
              <Menu.Item disabled>Item D</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Open menu
        await click(getMenuButton())

        // We opened via click, we don't have an active item
        assertNoActiveMenuItem(getMenu())

        // We should not be able to go to the end
        await press(Keys.Home)

        assertNoActiveMenuItem(getMenu())
      })
    )
  })

  describe('`Any` key aka search', () => {
    it(
      'should be possible to type a full word that has a perfect match',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>alice</Menu.Item>
              <Menu.Item>bob</Menu.Item>
              <Menu.Item>charlie</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Open menu
        await click(getMenuButton())

        const items = getMenuItems()

        // We should be able to go to the second item
        await type(word('bob'))
        assertMenuLinkedWithMenuItem(getMenu(), items[1])

        // We should be able to go to first item
        await type(word('alice'))
        assertMenuLinkedWithMenuItem(getMenu(), items[0])

        // We should be able to go to last item
        await type(word('charlie'))
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )

    it(
      'should be possible to type a partial of a word',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>alice</Menu.Item>
              <Menu.Item>bob</Menu.Item>
              <Menu.Item>charlie</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.ArrowUp)

        const items = getMenuItems()

        // We should be on the last item
        assertMenuLinkedWithMenuItem(getMenu(), items[2])

        // We should be able to go to the second item
        await type(word('bo'))
        assertMenuLinkedWithMenuItem(getMenu(), items[1])

        // We should be able to go to the first item
        await type(word('ali'))
        assertMenuLinkedWithMenuItem(getMenu(), items[0])

        // We should be able to go to the last item
        await type(word('char'))
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )

    it(
      'should not be possible to search for a disabled item',
      suppressConsoleLogs(async () => {
        render(
          <Menu>
            <Menu.Button>Trigger</Menu.Button>
            <Menu.Items>
              <Menu.Item>alice</Menu.Item>
              <Menu.Item disabled>bob</Menu.Item>
              <Menu.Item>charlie</Menu.Item>
            </Menu.Items>
          </Menu>
        )

        // Focus the button
        getMenuButton()?.focus()

        // Open menu
        await press(Keys.ArrowUp)

        const items = getMenuItems()

        // We should be on the last item
        assertMenuLinkedWithMenuItem(getMenu(), items[2])

        // We should not be able to go to the disabled item
        await type(word('bo'))

        // We should still be on the last item
        assertMenuLinkedWithMenuItem(getMenu(), items[2])
      })
    )
  })
})

describe('mouse interactions', () => {
  it(
    'should be possible to open a menu on click',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>Item A</Menu.Item>
            <Menu.Item>Item B</Menu.Item>
            <Menu.Item>Item C</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      assertMenuButton(getMenuButton(), {
        state: MenuButtonState.Closed,
        attributes: { id: 'tailwindui-menu-button-1' },
      })
      assertMenu(getMenu(), { state: MenuState.Closed })

      // Open menu
      await click(getMenuButton())

      // Verify it is open
      assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })
      assertMenu(getMenu(), {
        state: MenuState.Open,
        attributes: { id: 'tailwindui-menu-items-2' },
      })
      assertMenuButtonLinkedWithMenu(getMenuButton(), getMenu())

      // Verify we have menu items
      const items = getMenuItems()
      expect(items).toHaveLength(3)
      items.forEach(item => assertMenuItem(item))
    })
  )

  it(
    'should be possible to close a menu on click',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>Item A</Menu.Item>
            <Menu.Item>Item B</Menu.Item>
            <Menu.Item>Item C</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      // Open menu
      await click(getMenuButton())

      // Verify it is open
      assertMenuButton(getMenuButton(), { state: MenuButtonState.Open })

      // Click to close
      await click(getMenuButton())

      // Verify it is closed
      assertMenuButton(getMenuButton(), { state: MenuButtonState.Closed })
      assertMenu(getMenu(), { state: MenuState.Closed })
    })
  )

  it('should focus the menu when you try to focus the button again (when the menu is already open)', async () => {
    render(
      <Menu>
        <Menu.Button>Trigger</Menu.Button>
        <Menu.Items>
          <Menu.Item>Item A</Menu.Item>
          <Menu.Item>Item B</Menu.Item>
          <Menu.Item>Item C</Menu.Item>
        </Menu.Items>
      </Menu>
    )

    // Open menu
    await click(getMenuButton())

    // Verify menu is focused
    assertActiveElement(getMenu())

    // Try to Re-focus the button
    getMenuButton()?.focus()

    // Verify menu is still focused
    assertActiveElement(getMenu())
  })

  it(
    'should be a no-op when we click outside of a closed menu',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>alice</Menu.Item>
            <Menu.Item>bob</Menu.Item>
            <Menu.Item>charlie</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      // Verify that the window is closed
      assertMenu(getMenu(), { state: MenuState.Closed })

      // Click something that is not related to the menu
      await click(document.body)

      // Should still be closed
      assertMenu(getMenu(), { state: MenuState.Closed })
    })
  )

  it(
    'should be possible to click outside of the menu which should close the menu',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>alice</Menu.Item>
            <Menu.Item>bob</Menu.Item>
            <Menu.Item>charlie</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      // Open menu
      await click(getMenuButton())
      assertMenu(getMenu(), { state: MenuState.Open })

      // Click something that is not related to the menu
      await click(document.body)

      // Should be closed now
      assertMenu(getMenu(), { state: MenuState.Closed })
    })
  )

  it(
    'should be possible to click outside of the menu which should close the menu (even if we press the menu button)',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>alice</Menu.Item>
            <Menu.Item>bob</Menu.Item>
            <Menu.Item>charlie</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      // Open menu
      await click(getMenuButton())
      assertMenu(getMenu(), { state: MenuState.Open })

      // Click the menu button again
      await click(getMenuButton())

      // Should be closed now
      assertMenu(getMenu(), { state: MenuState.Closed })
    })
  )

  it(
    'should be possible to hover an item and make it active',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>alice</Menu.Item>
            <Menu.Item>bob</Menu.Item>
            <Menu.Item>charlie</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      // Open menu
      await click(getMenuButton())

      const items = getMenuItems()
      // We should be able to go to the second item
      await hover(items[1])
      assertMenuLinkedWithMenuItem(getMenu(), items[1])

      // We should be able to go to first item
      await hover(items[0])
      assertMenuLinkedWithMenuItem(getMenu(), items[0])

      // We should be able to go to last item
      await hover(items[2])
      assertMenuLinkedWithMenuItem(getMenu(), items[2])
    })
  )

  it(
    'should not be possible to hover an item that is disabled',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>alice</Menu.Item>
            <Menu.Item disabled>bob</Menu.Item>
            <Menu.Item>charlie</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      // Open menu
      await click(getMenuButton())

      const items = getMenuItems()

      // Try to hover over item 1, which is disabled
      await hover(items[1])

      // We should not have an active item now
      assertNoActiveMenuItem(getMenu())
    })
  )

  it(
    'should be possible to mouse leave an item and make it inactive',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>alice</Menu.Item>
            <Menu.Item>bob</Menu.Item>
            <Menu.Item>charlie</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      // Open menu
      await click(getMenuButton())

      const items = getMenuItems()

      // We should be able to go to the second item
      await hover(items[1])
      assertMenuLinkedWithMenuItem(getMenu(), items[1])

      await unHover(items[1])
      assertNoActiveMenuItem(getMenu())

      // We should be able to go to first item
      await hover(items[0])
      assertMenuLinkedWithMenuItem(getMenu(), items[0])

      await unHover(items[0])
      assertNoActiveMenuItem(getMenu())

      // We should be able to go to last item
      await hover(items[2])
      assertMenuLinkedWithMenuItem(getMenu(), items[2])

      await unHover(items[2])
      assertNoActiveMenuItem(getMenu())
    })
  )

  it(
    'should be possible to mouse leave a disabled item and be a no-op',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>alice</Menu.Item>
            <Menu.Item disabled>bob</Menu.Item>
            <Menu.Item>charlie</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      // Open menu
      await click(getMenuButton())

      const items = getMenuItems()

      // Try to hover over item 1, which is disabled
      await hover(items[1])
      assertNoActiveMenuItem(getMenu())

      await unHover(items[1])
      assertNoActiveMenuItem(getMenu())
    })
  )

  it(
    'should be possible to click a menu item, which closes the menu',
    suppressConsoleLogs(async () => {
      render(
        <Menu>
          <Menu.Button>Trigger</Menu.Button>
          <Menu.Items>
            <Menu.Item>alice</Menu.Item>
            <Menu.Item>bob</Menu.Item>
            <Menu.Item>charlie</Menu.Item>
          </Menu.Items>
        </Menu>
      )

      // Open menu
      await click(getMenuButton())
      assertMenu(getMenu(), { state: MenuState.Open })

      const items = getMenuItems()

      // We should be to click the menu item
      await click(items[1])
      assertMenu(getMenu(), { state: MenuState.Closed })
    })
  )
})