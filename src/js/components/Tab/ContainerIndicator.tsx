import { observer } from 'mobx-react-lite'

let ContainerIndicator: any = () => null

if (process.env.TARGET_BROWSER === 'firefox') {
  ContainerIndicator = observer(require('./_ContainerIndicator').default)
}

export default ContainerIndicator
