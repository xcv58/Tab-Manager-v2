import React, { useRef, useEffect } from 'react'
import { observer } from 'mobx-react'
import { match } from 'fuzzy'
import classNames from 'classnames'
import { highlightBorderColor } from 'libs/colors'
import { makeStyles } from '@material-ui/styles'
import ButtonBase from '@material-ui/core/ButtonBase'
import Typography from '@material-ui/core/Typography'
import Url from 'components/Tab/Url'
import { useStore } from 'components/StoreContext'

const pre = `<span style='color:${highlightBorderColor}'>`
const post = '</span>'

const useStyles = makeStyles(theme => ({
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
}))

export default observer(props => {
  const { userStore } = useStore()
  const classes = useStyles()
  const { activate, title, urlCount, focus, isFocused } = props.tab
  const buttonRef = useRef(null)
  const { showUrl, highlightDuplicatedTab } = userStore
  const getHighlightNode = text => {
    const {
      tab: { isMatched, query }
    } = props
    if (!isMatched || !query) {
      return text
    }
    const result = match(query, text, { pre, post })
    if (!result) {
      return <div>{text}</div>
    }
    return <div dangerouslySetInnerHTML={{ __html: result.rendered }} />
  }
  useEffect(() => {
    const button = buttonRef.current
    if (!isFocused && document.activeElement === button) {
      button.blur()
    }
  }, [isFocused])
  const duplicated =
    urlCount > 1 && highlightDuplicatedTab && classes.duplicated
  return (
    <ButtonBase
      className={classes.ripple}
      buttonRef={buttonRef}
      onFocusVisible={focus}
      onClick={activate}
      component='div'
    >
      <Typography className={classNames(classes.text, duplicated)}>
        {getHighlightNode(title)}
      </Typography>
      {showUrl && (
        <Url
          {...props}
          className={classNames(classes.text, classes.url, duplicated)}
          getHighlightNode={getHighlightNode}
        />
      )}
    </ButtonBase>
  )
})
