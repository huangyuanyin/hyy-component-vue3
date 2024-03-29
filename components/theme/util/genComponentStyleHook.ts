/* eslint-disable no-redeclare */
import type { CSSInterpolation } from '@antd-tiny-vue/cssinjs'
import { useStyleRegister } from '@antd-tiny-vue/cssinjs'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { genCommonStyle, genLinkStyle } from '../../style'
import { useProviderConfigState } from '../../config-provider/context'
import type { UseComponentStyleResult } from '../internal'
import { mergeToken, statisticToken, useToken } from '../internal'
import type { ComponentTokenMap, GlobalToken } from '../interface'

export type OverrideTokenWithoutDerivative = ComponentTokenMap
export type OverrideComponent = keyof OverrideTokenWithoutDerivative
export type GlobalTokenWithComponent<ComponentName extends OverrideComponent> =
  GlobalToken & ComponentTokenMap[ComponentName]

export interface StyleInfo<ComponentName extends OverrideComponent> {
  hashId: string
  prefixCls: string
  rootPrefixCls: string
  iconPrefixCls: string
  overrideComponentToken: ComponentTokenMap[ComponentName]
}

export type TokenWithCommonCls<T> = T & {
  /** Wrap component class with `.` prefix */
  componentCls: string
  /** Origin prefix which do not have `.` prefix */
  prefixCls: string
  /** Wrap icon class with `.` prefix */
  iconCls: string
  /** Wrap ant prefixCls class with `.` prefix */
  antCls: string
}
export type FullToken<ComponentName extends OverrideComponent> =
  TokenWithCommonCls<GlobalTokenWithComponent<ComponentName>>

export default function genComponentStyleHook<
  ComponentName extends OverrideComponent
>(
  component: ComponentName,
  styleFn: (
    token: FullToken<ComponentName>,
    info: StyleInfo<ComponentName>
  ) => CSSInterpolation,
  getDefaultToken?:
    | OverrideTokenWithoutDerivative[ComponentName]
    | ((token: GlobalToken) => OverrideTokenWithoutDerivative[ComponentName])
) {
  return (prefixCls: Ref<string>): UseComponentStyleResult => {
    const [theme, token, hashId] = useToken()
    const { getPrefixCls, iconPrefixCls } = useProviderConfigState()
    const rootPrefixCls = computed(() => getPrefixCls())
    const sharedInfo = computed(() => {
      return {
        theme: theme.value,
        token: token.value,
        hashId: hashId.value,
        path: ['Shared', rootPrefixCls.value]
      }
    })
    // Generate style for all a tags in antd component.
    useStyleRegister(sharedInfo, () => [
      {
        // Link
        '&': genLinkStyle(token.value)
      }
    ])
    const componentInfo = computed(() => ({
      theme: theme.value,
      token: token.value,
      hashId: hashId.value,
      path: [component, prefixCls.value, iconPrefixCls.value]
    }))
    return [
      useStyleRegister(componentInfo, () => {
        const { token: proxyToken, flush } = statisticToken(token.value)

        const defaultComponentToken =
          typeof getDefaultToken === 'function'
            ? getDefaultToken(proxyToken)
            : getDefaultToken
        const mergedComponentToken = {
          ...defaultComponentToken,
          ...token.value[component]
        }

        const componentCls = `.${prefixCls.value}`
        const mergedToken = mergeToken<
          TokenWithCommonCls<GlobalTokenWithComponent<OverrideComponent>>
        >(
          proxyToken,
          {
            componentCls,
            prefixCls: prefixCls.value,
            iconCls: `.${iconPrefixCls.value}`,
            antCls: `.${rootPrefixCls.value}`
          },
          mergedComponentToken
        )

        const styleInterpolation = styleFn(
          mergedToken as unknown as FullToken<ComponentName>,
          {
            hashId: hashId.value,
            prefixCls: prefixCls.value,
            rootPrefixCls: rootPrefixCls.value,
            iconPrefixCls: iconPrefixCls.value,
            overrideComponentToken: token.value[component]
          }
        )
        flush(component, mergedComponentToken)
        return [
          genCommonStyle(token.value, prefixCls.value),
          styleInterpolation
        ]
      }),
      hashId
    ]
  }
}
