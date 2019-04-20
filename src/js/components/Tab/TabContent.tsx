import React from 'react'
import { inject, observer } from 'mobx-react'
import { match } from 'fuzzy'
import classNames from 'classnames'
import { highlightBorderColor } from 'libs/colors'
import { withStyles } from '@material-ui/core/styles'
import ButtonBase from '@material-ui/core/ButtonBase'
import Typography from '@material-ui/core/Typography'
import Url from 'components/Tab/Url'

const pre = `<span style='color:${highlightBorderColor}'>`
const post = '</span>'

const styles = theme => ({
  ripple: {
    flex: 1,
    height: '35px',
    fontSize: '1rem',
    display: 'flex',
    overflow: 'hidden',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    '&:hover $url': {
      opacity: 1
    }
  },
  text: {
    overflow: 'hidden',
    width: '100%',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis'
  },
  url: {
    opacity: 0.3,
    fontSize: '0.7rem'
  },
  duplicated: {
    color: theme.palette.error.light
  }
})

@withStyles(styles)
@inject('userStore')
@observer
class TabContent extends React.Component {
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
    const { classes } = this.props
    const { activate, title, urlCount } = this.props.tab
    const { showUrl, highlightDuplicatedTab } = this.props.userStore
    const duplicated =
      urlCount > 1 && highlightDuplicatedTab && classes.duplicated
    return (
      <ButtonBase
        focusRipple
        className={classes.ripple}
        onClick={activate}
        component='div'
      >
        <Typography className={classNames(classes.text, duplicated)}>
          {this.getHighlightNode(title)}
        </Typography>
        {showUrl && (
          <Url
            {...this.props}
            className={classNames(classes.text, classes.url, duplicated)}
            getHighlightNode={this.getHighlightNode}
          />
        )}
      </ButtonBase>
    )
  }
}

export default TabContent
