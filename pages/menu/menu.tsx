import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Transition, Menu } from '@tailwindui/react'

import { classNames } from '../../src/utils/class-names'

function NextLink(props: { children: React.ReactNode } & JSX.IntrinsicElements['a']) {
  const { href, children, ...rest } = props
  return (
    <Link href={href}>
      <a {...rest}>{children}</a>
    </Link>
  )
}

function SignOutButton(props) {
  return (
    <form method="POST" action="#" onSubmit={e => e.preventDefault()} className="w-full">
      <button type="submit" {...props}>
        Sign out
      </button>
    </form>
  )
}

function TailwindUIDropdown() {
  return (
    <Menu className="relative inline-block text-left">
      <>
        <div>
          <span className="rounded-md shadow-sm">
            <Menu.Button className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium leading-5 text-gray-700 transition duration-150 ease-in-out bg-white border border-gray-300 rounded-md hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-50 active:text-gray-800">
              <span>Options</span>
              <svg className="w-5 h-5 ml-2 -mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Menu.Button>
          </span>
        </div>

        {/* Dropdown panel, show/hide based on dropdown state. */}
        <Menu.Items>
          <Transition.Child
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
            className="absolute right-0 w-56 mt-2 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg"
          >
            <div className="px-4 py-3">
              <p className="text-sm leading-5">Signed in as</p>
              <p className="text-sm font-medium leading-5 text-gray-900 truncate">
                tom@example.com
              </p>
            </div>
            <div className="border-t border-gray-100"></div>
            <div className="py-1">
              <Menu.Item
                href="/"
                disabled
                className={({ active, disabled }) =>
                  classNames(
                    'block w-full text-left px-4 py-2 text-sm leading-5 text-gray-700',
                    active && 'bg-gray-100 text-gray-900',
                    disabled && 'cursor-not-allowed opacity-50'
                  )
                }
              >
                Account settings
              </Menu.Item>
              <Menu.Item
                href="/"
                className={({ active, disabled }) =>
                  classNames(
                    'block w-full text-left px-4 py-2 text-sm leading-5 text-gray-700',
                    active && 'bg-gray-100 text-gray-900',
                    disabled && 'cursor-not-allowed opacity-50'
                  )
                }
              >
                Support
              </Menu.Item>
              <Menu.Item
                href="/"
                disabled
                className={({ active, disabled }) =>
                  classNames(
                    'block w-full text-left px-4 py-2 text-sm leading-5 text-gray-700',
                    active && 'bg-gray-100 text-gray-900',
                    disabled && 'cursor-not-allowed opacity-50'
                  )
                }
              >
                New feature (soon)
              </Menu.Item>
              <Menu.Item
                as={NextLink}
                href="/"
                disabled
                className={({ active, disabled }) =>
                  classNames(
                    'block w-full text-left px-4 py-2 text-sm leading-5 text-gray-700',
                    active && 'bg-gray-100 text-gray-900',
                    disabled && 'cursor-not-allowed opacity-50'
                  )
                }
              >
                License
              </Menu.Item>
            </div>
            <div className="border-t border-gray-100"></div>
            <div className="py-1">
              <Menu.Item
                as={SignOutButton}
                disabled
                className={({ active, disabled }) =>
                  classNames(
                    'block w-full text-left px-4 py-2 text-sm leading-5 text-gray-700',
                    active && 'bg-gray-100 text-gray-900',
                    disabled && 'cursor-not-allowed opacity-50'
                  )
                }
              />
            </div>
          </Transition.Child>
        </Menu.Items>
      </>
    </Menu>
  )
}

export default function Home() {
  return (
    <>
      <Head>
        <title>Menu Component - Playground</title>
      </Head>

      <div className="flex justify-center w-screen h-full p-12 bg-gray-50">
        <TailwindUIDropdown />
      </div>
    </>
  )
}
