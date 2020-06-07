import { observer } from 'mobx-react-lite'

let Dump: any = () => null

if (process.env.TARGET_BROWSER === 'firefox') {
  Dump = observer(require('./_ContainerIndicator').default)
}

export default Dump
