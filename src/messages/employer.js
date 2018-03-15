import React, { Component } from "react"
import NavBar from "../layouts/NavBar"
import ".././styles/global.css"
import ".././styles/style.css"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"
import TextTruncate from "react-text-truncate"
import API from "./../services/api"
import constant from "./../configs/constant"
var moment = require("moment")
const ws = require("adonis-websocket-client")
const io = ws("http://localhost:3333")
const client = io.channel("chat").connect()
const FontAwesome = require("react-fontawesome")

class EmployerMessage extends Component {
  constructor(props) {
    super(props)
    this.inputMessageRef = null
    this.messagesEnd = null
    this.threadUrl = ""
    this.state = {
      inputMessage: "",
      renderContactsLoading: true,
      renderMessagesLoading: true,
      renderStaffsLoading: true,
      loading: true,
      thread: {},
      threads: [],
      conversation: [],
      tab: "staff",
      myStaffs: [],
      staffs: {
        bartender: { on: false, num: 0 },
        manager: { on: false, num: 0 },
        waiter: { on: false, num: 0 },
        chef: { on: false, num: 0 },
        barback: { on: false, num: 0 },
        kitchen: { on: false, num: 0 },
        host: { on: false, num: 0 }
      }
    }
  }

  componentWillMount = async () => {
    API.initRequest()

    let profile = await API.getProfile()
    this.setState({ profile })
    console.log("profile", profile)

    if (profile.isStaff) {
      this.threadUrl = "staff-messages"
    }

    if (profile.isVenue || profile.isEmployer) {
      this.threadUrl = "venue-messages"
      this.getMyStaffs()
    }

    API.get(this.threadUrl).then(res => {
      if (res.status) {
        this.setState(
          {
            threads: res.threads,
            renderContactsLoading: false,
            thread: res.threads[0]
          },
          () => {
            this.getConversation()
            this.connectSocket()
          }
        )
      }
    })
  }

  getStaffMessages = () => {
    this.setState(
      {
        renderContactsLoading: false
      },
      () => {
        API.get(this.threadUrl).then(res => {
          if (res.status) {
            this.setState({
              threads: res.threads,
              renderContactsLoading: false
            })
          }
        })
      }
    )
  }

  onChangeInput = e => {
    this.setState({
      [e.target.name]: e.target.value
    })
  }

  handleThreadClick = thread => {
    this.setState({ thread, renderMessagesLoading: true }, function() {
      this.getConversation()
    })
  }

  handleTabClick = tab => {
    this.setState({ tab }, () => {
      this.getMyStaffs()
    })
  }

  getMyStaffs = () => {
    API.get("my-staffs").then(res => {
      if (res.status) {
        const allStaff = []
        Object.keys(res.staffs).forEach(staff => {
          res.staffs[staff].forEach(as => {
            allStaff.push(as)
          })
        })
        this.setState({
          myStaffs: allStaff,
          renderStaffsLoading: false
        })
      }
    })
  }

  getConversation = () => {
    API.get(`conversation/${this.state.thread._id}`).then(res => {
      if (res.status) {
        let formatMessages = []
        let date = null
        res.messages.map((res, id) => {
          if (!date) {
            date = moment(res.sentAt).format("MM/DD/YYYY")
          }

          var $formatMessages = {
            _id: id,
            text: res.message,
            createdAt: moment(res.sentAt).format("h:mm A"),
            conversation: res.conversation,
            user: {
              _id: res.sender,
              name: "",
              avatar: res.staff.avatar
            }
          }

          if (date !== moment(res.sentAt).format("MM/DD/YYYY")) {
            $formatMessages.setDateBar = date
          }

          formatMessages.push($formatMessages)
        })

        this.setState({
          conversation: formatMessages,
          renderMessagesLoading: false
        })
        this.scrollToBottom()
      }
    })
  }

  connectSocket = () => {
    var self = this

    this.state.threads.forEach(thread => {
      client.joinRoom(thread._id, {}, (err, message) => {
        // console.log("join room", err, message)
      })
    })

    client.on("message", function(room, message) {
      // console.log("room", room, "message", message)
      if (message == "refresh-messages") {
        self.getConversation()
        self.getStaffMessages()
      }
    })
  }

  leaveSocketRoom = id => {
    client.leaveRoom(id, {}, (err, message) => {
      console.log(err, message)
    })
  }

  scrollToBottom = () => {
    this.messagesEnd.scrollIntoView()
  }

  onSend = event => {
    event.preventDefault()
    var self = this

    var thread = this.state.thread

    var body = {
      receiver: thread.usid,
      message: this.state.inputMessage,
      convo: this.state.thread._id
    }

    body[this.state.profile.isStaff ? "venue" : "staff"] = thread.uselect

    API.post(
      this.state.profile.isStaff ? "new-venue-message" : "new-staff-message",
      body
    ).then(res => {
      if (res.status) {
        self.setState({ inputMessage: "" }, function() {
          self.inputMessageRef.focus()
        })
      }
    })
  }

  renderMessages = () => {
    if (this.state.renderMessagesLoading) {
      return (
        <div className="container xem center navigator">
          <img alt="" src={require("./../assets/icons/loading.svg")} />
        </div>
      )
    }

    return (
      <div className="m-content">
        {this.state.conversation
          .slice(0)
          .reverse()
          .map((message, index) => {
            return (
              <div key={index}>
                {message.setDateBar ? (
                  <div className="m-line">
                    <div className="a-line" />
                    <div className="m-today">{message.setDateBar}</div>
                  </div>
                ) : null}
                <div
                  className={
                    this.state.profile._id === message.user._id
                      ? "m-message-right"
                      : "m-message-left"
                  }
                >
                  {message.text}
                </div>
                <div
                  className={
                    this.state.profile._id === message.user._id
                      ? "m-time-right"
                      : "m-time-left"
                  }
                >
                  {message.createdAt}
                </div>
              </div>
            )
          })}
        <div
          style={{ float: "left", clear: "both" }}
          ref={el => {
            this.messagesEnd = el
          }}
        />
      </div>
    )
  }

  renderContactMenu = () => {
    if (this.state.profile) {
      return (
        <div className="m-contacts-menu">
          <div
            className={
              this.state.tab === "chat"
                ? "m-contacts-menu-item-active"
                : "m-contacts-menu-item"
            }
            onClick={this.handleTabClick.bind(this, "chat")}
          >
            <span>CHAT</span>
          </div>
          {this.state.profile.isEmployer || this.state.profile.isVenue ? (
            <div
              className={
                this.state.tab === "staff"
                  ? "m-contacts-menu-item-active"
                  : "m-contacts-menu-item"
              }
              onClick={this.handleTabClick.bind(this, "staff")}
            >
              <span>STAFF</span>
            </div>
          ) : null}
        </div>
      )
    }
  }

  renderContacts = () => {
    if (this.state.renderContactsLoading) {
      return (
        <div className="container xem center navigator">
          <img alt="" src={require("./../assets/icons/loading.svg")} />
        </div>
      )
    }

    return (
      <div>
        {this.state.threads.map((thread, index) => {
          return (
            <div
              key={index}
              className="m-thread"
              onClick={this.handleThreadClick.bind(this, thread)}
            >
              <div className="row">
                <div className="col-sm-3">
                  <img alt="" className="profile-thumb" src={thread.uavatar} />
                </div>
                <div className="col-sm-9">
                  <span>{thread.uname}</span>
                  <div className="m-thread-msg">
                    {!thread.seen ? (
                      <span className="a-badge pull-right" />
                    ) : null}
                    <TextTruncate
                      line={1}
                      truncateText="…"
                      text={thread.message}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  onSelectOption = (key, obj) => {
    let _obj = this.state[obj]
    if (obj === "staffs") {
      _obj[key].on = !_obj[key].on
    } else {
      _obj[key] = !_obj[key]
    }
    this.setState(prevState => ({ [obj]: _obj }))
  }

  renderStaff = () => {
    if (this.state.renderStaffsLoading) {
      return (
        <div className="container xem center navigator">
          <img alt="" src={require("./../assets/icons/loading.svg")} />
        </div>
      )
    }

    return (
      <div className="a-icon-container-sm xxm scroll h-scroll">
        {Object.keys(this.state.staffs).map((key, index) => {
          if (this.state.staffs[key].on) {
            return (
              <div
                className="vs-service-item-active"
                key={index}
                onClick={() => this.onSelectOption(key, "staffs")}
              >
                <a className="vs-service-action">
                  <img
                    alt=""
                    src={require(`.././assets/icons/staff/white/${key}.png`)}
                  />
                </a>
                <p className="xxm">{key.capitalize()}</p>
              </div>
            )
          } else {
            return (
              <div
                className="vs-service-item"
                key={index}
                onClick={() => this.onSelectOption(key, "staffs")}
              >
                <a className="vs-service-action">
                  <img
                    alt=""
                    src={require(`.././assets/icons/staff/default/${key}.png`)}
                  />
                </a>
                <p className="xxm">{key.capitalize()}</p>
              </div>
            )
          }
        })}
      </div>
    )
  }

  renderMyStaff = () => {
    if (this.state.renderStaffsLoading) {
      return (
        <div className="container xem center navigator">
          <img alt="" src={require("./../assets/icons/loading.svg")} />
        </div>
      )
    }

    return (
      <div>
        {this.state.myStaffs.map((staff, index) => {
          return (
            <div
              key={index}
              className="m-thread"
              onClick={this.handleThreadClick.bind(this, staff)}
            >
              <div className="row">
                <div className="col-sm-3">
                  <img
                    alt=""
                    className="profile-thumb"
                    src={staff.staff.avatar}
                  />
                </div>
                <div className="col-sm-9">
                  <span>{staff.staff.fullname}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  renderComposer = () => {
    return (
      <div className="m-composer">
        <a className="m-icon pull-left">
          <img
            alt=""
            src={require(".././assets/icons/messages/attachment.png")}
          />
        </a>
        <form onSubmit={this.onSend}>
          <input
            type="text"
            name="inputMessage"
            placeholder="Type here to write something"
            ref={input => {
              this.inputMessageRef = input
            }}
            value={this.state.inputMessage}
            onChange={this.onChangeInput}
          />
          <button onClick={this.onSend}>
            <i className="fa fa-paper-plane" />
          </button>
        </form>
      </div>
    )
  }

  render() {
    return (
      <div>
        <NavBar />
        <div className="container xxem">
          <div className="content-messages">
            <div className="messages-header">
              <div className="row">
                <div className="col-sm-4 m-head">
                  <span>My Conversations</span>
                  <a className="m-icon pull-right">
                    <img
                      alt=""
                      src={require(".././assets/icons/messages/gear.png")}
                    />
                  </a>
                  <a className="m-icon pull-right">
                    <img
                      alt=""
                      src={require(".././assets/icons/messages/edit.png")}
                    />
                  </a>
                </div>
              </div>
            </div>
            <div className="messages-body">
              <div className="row">
                <div className="col-sm-4 m-contacts">
                  {this.renderContactMenu()}
                  {this.state.tab === "chat" ? this.renderContacts() : null}
                  {this.state.tab === "staff" ? this.renderStaff() : null}
                  {this.state.tab === "staff" ? this.renderMyStaff() : null}
                </div>

                <div className="col-sm-8 m-messages">
                  {this.renderMessages()}
                  {this.renderComposer()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => ({})

const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch)

export default connect(mapStateToProps, mapDispatchToProps)(EmployerMessage)
