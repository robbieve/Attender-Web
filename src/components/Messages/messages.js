import React, { Component } from "react"
import NavBar from "./../layouts/NavBar"
import "./../.././styles/global.css"
import "./../.././styles/style.css"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"
import TextTruncate from "react-text-truncate"
import API from "./../../services/api"
import constant from "./../../configs/constant"
import { push } from "react-router-redux"
import { Link } from "react-router-dom"
import _ from "lodash/core"

import SubscribePopUp from "./.././layouts/SubscribePopUp/SubscribePopUp"
import { setSubscribePopUp } from "./../../actions/myProfile-actions"
import { loadState, saveState } from "./../../localStorage"
var moment = require("moment")
const ws = require("adonis-websocket-client")
const io = ws(constant.API_URL.replace("/api/", ""))
const client = io.channel("chat").connect()
const FontAwesome = require("react-fontawesome")

class Messages extends Component {
  constructor(props) {
    super(props)
    this.inputMessageRef = null
    this.messagesEnd = null
    this.threadUrl = ""
    this.state = {
      eventDropdown: "init",
      openHiringOptionsModal: false,
      inputMessage: "",
      renderContactsLoading: true,
      renderMessagesLoading: true,
      renderStaffsLoading: true,
      loading: true,
      thread: {},
      threads: [],
      conversation: [],
      tab: "chat",
      myStaffs: [],
      staffs: {
        all: { on: true },
        barista: { on: false },
        bartender: { on: false },
        manager: { on: false },
        waiter: { on: false },
        chef: { on: false },
        barback: { on: false },
        kitchen: { on: false },
        host: { on: false }
      },
      staffFilters: [],
      selectedStaff: {},
      showSubscribeNowOffer: false
    }
  }
  componentWillMount = async () => {
    API.initRequest()

    const profile = this.props.myProfile

    this.setState({ profile })

    if (profile.isStaff) {
      this.threadUrl = "staff-messages"
    }

    if (profile.isVenue || profile.isEmployer) {
      this.threadUrl = "venue-messages"
      this.getMyStaffs()
    }

    API.get(this.threadUrl).then(res => {
      if (res && res.status) {
        this.setState(
          {
            threads: res.threads,
            renderContactsLoading: false
            // thread: res.threads[0]
          },
          () => {
            if (res.threads.length > 1) {
              this.getConversation()
              this.connectSocket()
            }
          }
        )
      }
    })

    // get staff staff/this.props.match.staff/show
    if (this.props.match.params.staff) {
      // SEND Initial MESSAGE
      var self = this
      var thread = this.state.thread

      var body = {
        staff: this.props.match.params.staff,
        receiver: this.props.match.params.staff,
        message: "Hi, I would like to connect with you."
      }

      API.post(
        this.props.myProfile.isStaff
          ? "new-venue-message"
          : !_.isEmpty(thread)
            ? "new-staff-message"
            : "new-initial-message",
        body
      ).then(res => {
        if (res.status) {
          self.setState({ inputMessage: "" }, function() {
            if (res.thread) {
              self.setState({ renderMessagesLoading: true }, () => {
                const thread = res.thread
                client.joinRoom(thread._id, {}, (err, message) => {
                  self.setState(
                    {
                      threads: [...self.state.threads, thread],
                      thread,
                      renderMessagesLoading: false
                    },
                    () => {
                      self.getConversation()
                    }
                  )
                })
              })
            }
            self.inputMessageRef.focus()
          })
        }
      })
    }
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

  handleThreadClick = (thread, staff) => {
    if (thread) {
      this.setState({ thread, renderMessagesLoading: true }, () => {
        this.getConversation()
      })
    }

    if (!thread) {
      this.setState({ thread: null })
      // this.setState({ selectedStaff: staff })
    }
  }

  handleTabClick = tab => {
    this.setState({ tab }, () => {
      this.getMyStaffs()
    })
  }

  handleDeleteConversation = thread => {
    API.post(`conversation/${thread._id}/delete`, {}).then(res => {
      if (res.status) {
        this.setState(
          { renderContactsLoading: true, renderMessagesLoading: true },
          () => {
            this.getStaffMessages()
            this.getConversation()
          }
        )
      }
    })
  }
  handleArchiveThread = thread => {
    API.post(`conversation/${thread._id}/archive`, {}).then(res => {
      if (res.status) {
        this.setState(
          { renderContactsLoading: true, renderMessagesLoading: true },
          () => {
            alert("Message archived successfully!")
            this.getStaffMessages()
            this.getConversation()
          }
        )
      }
    })
  }

  getMyStaffs = () => {
    API.get("my-staffs?withTrial=true").then(res => {
      if (res && res.status) {
        const allStaff = []
        Object.keys(res.staffs).forEach(staff => {
          res.staffs[staff].forEach(as => {
            if (
              allStaff.length === 0 ||
              !allStaff.find(asf => asf.staff._id === as.staff._id)
            ) {
              allStaff.push(as)
            }
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
    let thread_id = this.state.thread._id ? this.state.thread._id : ""
    API.get(`conversation/${thread_id}`).then(res => {
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
      // console.log(err, message)
    })
  }

  scrollToBottom = () => {
    this.messagesEnd && this.messagesEnd.scrollIntoView()
  }

  onSend = event => {
    event.preventDefault()
    var self = this

    var thread = this.state.thread

    var body = {
      receiver:
        typeof thread.usid === "undefined"
          ? thread.usid
          : this.props.match.params.staff,
      message: this.state.inputMessage
    }

    thread && (body.convo = this.state.thread._id)
    body[this.state.profile.isStaff ? "venue" : "staff"] = thread
      ? thread.uselect
      : this.state.selectedStaff._id
    API.post(
      this.state.profile.isStaff
        ? "new-venue-message"
        : thread
          ? "new-staff-message"
          : "new-initial-message",
      body
    ).then(res => {
      if (res.status) {
        self.setState({ inputMessage: "" }, function() {
          if (res.thread) {
            self.setState({ renderMessagesLoading: true }, () => {
              const thread = res.thread
              client.joinRoom(thread._id, {}, (err, message) => {
                self.setState(
                  {
                    threads: [...self.state.threads, thread],
                    thread,
                    renderMessagesLoading: false
                  },
                  () => {
                    self.getConversation()
                  }
                )
              })
            })
          }
          self.inputMessageRef.focus()
        })
      }
    })
  }

  renderMessages = () => {
    if (this.state.renderMessagesLoading) {
      return (
        <div className="container xem center navigator">
          <img alt="" src={require("./../../assets/icons/loading.svg")} />
        </div>
      )
    }

    return (
      <div className="m-content">
        {!this.state.thread ? (
          <div className="container xem center navigator">
            <a href="javascript:void(0)" className="nav-brand">
              <FontAwesome name="comments" size="2x" />
              &nbsp;&nbsp;Start Conversation
            </a>
          </div>
        ) : (
          this.state.conversation
            .slice(0)
            .reverse()
            .map((message, index) => {
              return (
                <div className="m-message" key={index}>
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
            })
        )}
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
          <div
            className={
              this.state.tab === "contacts"
                ? "m-contacts-menu-item-active"
                : "m-contacts-menu-item"
            }
            onClick={this.handleTabClick.bind(this, "contacts")}
          >
            <span>CONTACTS</span>
          </div>
          <div
            className={
              this.state.tab === "online"
                ? "m-contacts-menu-item-active"
                : "m-contacts-menu-item"
            }
            onClick={this.handleTabClick.bind(this, "online")}
          >
            <span>ONLINE</span>
          </div>
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
          <img alt="" src={require("./../../assets/icons/loading.svg")} />
        </div>
      )
    }

    return (
      <div>
        {this.state.threads.map((thread, index) => {
          const uavatar =
            thread.uavatar !== "undefined"
              ? thread.uavatar
              : "http://via.placeholder.com/150x150"
          return (
            <div
              key={index}
              className={
                this.state.thread._id === thread._id
                  ? "m-thread active"
                  : "m-thread"
              }
              onClick={this.handleThreadClick.bind(this, thread)}
            >
              <div className="profile">
                <div className="profile-thumb-wrapper">
                  <span className="status" />
                  <img alt="" className="profile-thumb" src={uavatar} />
                </div>
                <div className="profile-details">
                  <span className="name">{thread.uname}</span>
                  <div className="pull-right">
                    {this.state.thread._id === thread._id &&
                    this.props.myProfile.isStaff === false ? (
                      <div className="drop-menu gear">
                        <span
                          onMouseOver={this.showGearOption.bind(
                            this,
                            thread._id
                          )}
                        >
                          <i className="fa fa-cog" />
                        </span>
                        {this.state.eventDropdown === thread._id ? (
                          <div className="e-dropdown">
                            <div className="e-dropdown-content">
                              <p
                                onClick={this.handleDeleteConversation.bind(
                                  this,
                                  thread
                                )}
                              >
                                Delete Conversation
                              </p>
                              <p
                                onClick={this.handleArchiveThread.bind(
                                  this,
                                  thread
                                )}
                              >
                                Archived
                              </p>
                              <Link to={`/staff/profile/${thread.usid}`}>
                                View Profile
                              </Link>
                              <p onClick={this.handleOpenModal}>
                                Hiring Options
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : !thread.seen ? (
                      <span className="a-badge pull-right" />
                    ) : null}
                  </div>
                  <div className="m-thread-msg">
                    <TextTruncate
                      line={1}
                      truncateText="…"
                      text={thread.message}
                    />
                    <span className="m-msg-count pull-right"> 2 </span>
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
    _obj[key].on = !_obj[key].on

    if (key === "all") {
      const staffs = { ...this.state.staffs }
      Object.keys(staffs).forEach(
        i => (i !== "all" ? (staffs[i].on = false) : (staffs[i].on = true))
      )
      this.setState({ staffs })
    }

    if (key !== "all") {
      const staffs = { ...this.state.staffs }
      staffs.all.on = false
      this.setState({ staffs })
    }

    this.setState(prevState => ({ [obj]: _obj }))

    this.setState({
      staffFilters: Object.keys(this.state.staffs).filter(
        i => this.state.staffs[i].on
      )
    })
  }

  renderStaff = () => {
    if (this.state.renderStaffsLoading) {
      return (
        <div className="container xem center navigator">
          <img alt="" src={require("./../../assets/icons/loading.svg")} />
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
                    src={require(`../../assets/icons/staff/white/${key}.png`)}
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
                    src={require(`../../assets/icons/staff/default/${key}.png`)}
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
          <img alt="" src={require("./../../assets/icons/loading.svg")} />
        </div>
      )
    }

    return (
      <div>
        {this.state.myStaffs
          .filter(
            m =>
              this.state.staffs.all.on
                ? m
                : m.staff.position.some(
                    p =>
                      Object.keys(this.state.staffs)
                        .filter(i => this.state.staffs[i].on)
                        .indexOf(p) >= 0
                  )
          )
          .map((staff, index) => {
            const avatar =
              staff.staff.avatar !== "undefined"
                ? staff.staff.avatar
                : "http://via.placeholder.com/150x150"
            let classVal = "m-thread"
            if (this.state.thread !== null) {
              if (this.state.thread.usid === staff.staff._id) {
                classVal += " active"
              }
            } else {
              if (this.state.selectedStaff._id == staff.staff._id) {
                classVal += " active"
              }
            }
            return (
              <div
                key={index}
                className={classVal}
                onClick={this.handleThreadClick.bind(
                  this,
                  this.state.threads.find(t => t.uselect === staff.staff._id),
                  staff.staff
                )}
              >
                <div className="row">
                  <div className="col-sm-3">
                    <img alt="" className="profile-thumb" src={avatar} />
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

  handleViewProfileClick = () => {
    this.props.goToStaff(this.props.match.params.staff)
  }

  handleOpenModal = () => {
    const openHiringOptionsModal = !this.state.openHiringOptionsModal
    console.log(
      this.props.myProfile.isVenue,
      !this.props.myProfile.isSubscribed,
      openHiringOptionsModal
    )
    if (
      this.props.myProfile.isVenue &&
      !this.props.myProfile.isSubscribed &&
      openHiringOptionsModal
    ) {
      this.setState({ showSubscribeNowOffer: true })
    }
    this.setState({ openHiringOptionsModal })
  }

  onPressStartTrial = () => {
    API.post(`trial/${this.state.thread.staff._id}`, {}).then(res => {
      this.setState({ renderStaffsLoading: true, tab: "staff" }, () => {
        this.getMyStaffs()
        this.handleOpenModal()
        this.props.goToTrial()
      })
    })
  }

  onPressSkipTrial = () => {
    API.post(`direct-hire/${this.state.thread.staff._id}`, {}).then(res => {
      this.setState({ renderStaffsLoading: true }, () => {
        this.getMyStaffs()
        this.handleOpenModal()
        this.props.goToActive()
      })
    })
  }

  renderEventModal = () => {
    if (
      !this.props.myProfile.isVenue ||
      (this.props.myProfile.isVenue && this.props.myProfile.isSubscribed)
    )
      return (
        <div
          className={
            this.state.openHiringOptionsModal ? "a-modal show" : "a-modal"
          }
        >
          <div className="a-modal-content">
            <span onClick={() => this.handleOpenModal()} className="a-close">
              &times;
            </span>
            <div className="row">
              <div className="col-sm-12">
                <div className="xem center navigator">
                  <div className="m-composer">
                    <div>
                      <button onClick={this.onPressStartTrial}>OK</button>
                      Start Trial
                    </div>
                    or
                    <div>
                      <button onClick={this.onPressSkipTrial}>
                        <i className="fa fa-arrow-right" />
                      </button>
                      Skip Trial
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
  }

  renderComposer = () => {
    return (
      <div className="m-composer">
        <a className="m-icon pull-left">
          <img
            alt=""
            src={require("./../../assets/icons/messages/attachment.png")}
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

  showGearOption(index) {
    this.setState({ eventDropdown: index })
  }
  openDropdown = index => {
    if (this.state.eventDropdown === index) {
      this.setState({ eventDropdown: "init" })
    } else {
      this.setState({ eventDropdown: index })
    }
  }

  renderNewMessage = () => {
    return (
      <div className="m-content">
        To: Recipient
        {this.renderEventModal()}
      </div>
    )
  }

  render() {
    return (
      <div>
        {this.state.showSubscribeNowOffer ? (
          <SubscribePopUp
            close={() => {
              this.setState({ showSubscribeNowOffer: false })
              this.handleOpenModal()
            }}
          />
        ) : null}
        <NavBar />
        <div className="container xxem messages-page">
          <div className="content-messages">
            <div className="messages-header">
              <div className="row">
                <div className="col-sm-4 m-head left">
                  <span>My Conversations</span>
                  <div className="pull-right">
                    <a className="m-icon">
                      <img
                        alt=""
                        src={require("./../../assets/icons/messages/edit.png")}
                      />
                    </a>
                    <a className="m-icon no-margin">
                      <img
                        alt=""
                        src={require("./../../assets/icons/messages/gear.png")}
                      />
                    </a>
                    {Object.keys(this.state.thread).length !== 0 ? (
                      <div className="drop-menu">
                        {this.props.myProfile.isStaff === false ? (
                          <img
                            alt=""
                            src={require("./../../assets/icons/messages/gear.png")}
                            onClick={() => this.openDropdown("e-1")}
                          />
                        ) : null}
                        <div
                          className="e-dropdown"
                          style={{
                            display:
                              this.state.eventDropdown === "e-1"
                                ? "block"
                                : "none"
                          }}
                        >
                          <div className="e-dropdown-content">
                            <p onClick={this.handleViewProfileClick}>
                              View Profile
                            </p>
                            <p onClick={this.handleOpenModal}>Hiring Options</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="col-sm-8 m-head right">
                  <div className="msg-search-wrapper">
                    <form className="msg-search rounded">
                      <input
                        type="search"
                        value=""
                        placeholder="Type to search"
                      />
                      <input type="submit" value="&#xf002;" />
                    </form>
                  </div>
                  <div
                    className="eb pull-right drop-menu"
                    onClick={() => this.openDropdown(`msg-eb-dropdown`)}
                  >
                    <span className="rounded2">eb</span>{" "}
                    <i className="fa fa-caret-down" />
                    <div
                      className="e-dropdown top"
                      style={{
                        display:
                          this.state.eventDropdown === `msg-eb-dropdown`
                            ? "block"
                            : "none"
                      }}
                    >
                      <a href="#" className="">
                        Delete Conversation
                      </a>
                      <a href="#" className="">
                        View Profile
                      </a>
                      <a href="#" className="">
                        Hire Options
                      </a>
                    </div>
                  </div>
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
                <div className="m-messages">
                  {this.renderEventModal()}
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

const mapStateToProps = state => {
  return state
}

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      goToTrial: () => push(`/staffs/trial`),
      goToActive: () => push(`/staffs`),
      goToStaff: staffId => push(`/find-staff/${staffId}`),
      onSetSubscribePopUp: setSubscribePopUp
    },
    dispatch
  )

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Messages)
