import { observer } from 'mobx-react-lite'

let ContainerOrGroupIndicator = (): React.ReactNode => null

if (process.env.TARGET_BROWSER === 'firefox') {
  ContainerOrGroupIndicator = observer(require('./_ContainerIndicator').default)
}

if (process.env.TARGET_BROWSER === 'chrome') {
  ContainerOrGroupIndicator = observer(require('./_TabGroupIndicator').default)
}

export default ContainerOrGroupIndicator
