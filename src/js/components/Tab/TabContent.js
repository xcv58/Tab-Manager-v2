import React from 'react'
import { inject, observer } from 'mobx-react'
import { match } from 'fuzzy'
import { highlightBorderColor } from 'libs/colors'
import Url from 'components/Tab/Url'

const pre = `<span style='color:${highlightBorderColor}'>`
const post = '</span>'

@inject('userStore')
@observer
export default class TabContent extends React.Component {
  getHighlightNode = text => {
    const {
      tab: { isMatched, query }
    } = this.props
    if (!isMatched || !query) {
      return text
    }
    const result = match(query, text, { pre, post })
    if (!result) {
      return <div>{text}</div>
    }
    return <div dangerouslySetInnerHTML={{ __html: result.rendered }} />
  }

  render () {
    const { activate, title } = this.props.tab
    const { showUrl } = this.props.userStore
    return (
      <div
        onClick={activate}
        style={{
          flex: 1,
          height: '35px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        {this.getHighlightNode(title)}
        {showUrl && (
          <Url {...this.props} getHighlightNode={this.getHighlightNode} />
        )}
      </div>
    )
  }
}
