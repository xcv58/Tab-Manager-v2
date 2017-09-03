import { action, observable } from 'mobx'

class TimerStore {
  @observable timer = 0
  @action resetTimer = () => {
    this.timer = 0
  }
}

const timerStore = new TimerStore()

setInterval(action(() => {
  timerStore.timer += 1
}), 1000)

export default timerStore
