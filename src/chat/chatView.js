import React, { useEffect, useState } from 'react';
import {Link, useHistory} from 'react-router-dom';
import {Container, Row, Col, Button, Form} from 'react-bootstrap';
import Popup from "reactjs-popup";

import TimerReady from './TimerReady';

import './chatview.css';
import './chat1.css';
import './chat2.css';

import OtherTeamView from './otherTeamView';
import reglerShort from './spelreglerS';
import reglerLong from './spelreglerL';


const firebase = require('firebase');

function ChatView({email, resultHandler}) {
    const history = useHistory();
    const [chats, setChats] = useState([]);
    const [name, setName] = useState('');
    const [imgURL, setImgURL] = useState('');
    const [askIfReady, setAskIfReady] = useState(true);

    useEffect(() => {
        firebase.auth().onAuthStateChanged(async _usr => {
            if (!_usr) { // Om användaren INTE finns --> Skicka användaren till startsidan
                history.push('/');
            } else { 
                await firebase // Invänta svar från databseen
                    .firestore() // Firestore är den DB vi använder 
                    .collection('chats') // Hämtar collection 'chats'
                    .where('users', 'array-contains', _usr.email) // Välj de chatter vars användare innehåller den aktuella användaren
                    .onSnapshot(async res => {
                        const chats = res.docs.map(_doc => _doc.data());
                        await (
                            setChats(chats)
                        )
                    })
            }
        })

        firebase
            .firestore()
            .collection('users')
            .doc(email)
            .onSnapshot(function(doc) {
                setName(doc.data().name)
                setImgURL(doc.data().imgURL)
            });
    }, []);
    
    const askIfReadyHandler = () => {
        if (askIfReady) {
            setAskIfReady(false);
        }
    }

    let currentUsers = "";
    let usersVoted = [];
    let firstMailInCHat;
    let teamReady;
    
    console.log('---')
    console.log(chats[1])

    chats.filter((_chat, _index) => {
        let bool = false;

        _chat.users.forEach(user => {
            if (user === email) {
                bool = true;
            }
        })

        return bool;
    }).forEach((_chat, _index) => {
        document.getElementById('chatMessages').innerHTML = "";

        _chat.users.forEach((user, index, array) => {
            if (index !== array.length - 1) { 
                currentUsers += user + ":"; 
            } else {
                currentUsers += user
            }
        })

        console.log(_index)
        teamReady = _chat.teamReady;

        usersVoted = _chat.usersVoted;

        const chatRef = firebase.firestore().collection('chats').doc(currentUsers);

        console.log(teamReady, 'Teamready')
        // --- Visa valda kort ---
        if (teamReady) {
            setTimeout(() => {
                
                const chosenRed = _chat.chosenRedCard;
                const chosenBlue = _chat.chosenBlueCard;
                console.log(chosenRed)
                console.log(chosenBlue)
                const tempCardsContainer = document.createElement('div');

                for (let r = 0; r < chosenRed; r++) {
                    const redCardElement = document.createElement('img');
                    redCardElement.src = require('../red_card.png');
                    redCardElement.className = 'choicesCard';
                    tempCardsContainer.append(redCardElement)
                }
                
                for (let b = 0; b < chosenBlue; b++) {
                    const blueCardElement = document.createElement('img');
                    blueCardElement.src = require('../blue_card.png');
                    blueCardElement.className = 'choicesCard';
                    tempCardsContainer.append(blueCardElement)
                }

                const chosenCardContainer = document.getElementById('chosenCardContainer');

                if (chosenCardContainer !== null) {
                    chosenCardContainer.innerHTML = '';
                    chosenCardContainer.append(tempCardsContainer);
                }

            }, 50)
            
        }
        // -----------------------

        if (_chat.chosenBlueCard + _chat.chosenRedCard === 3) {
            const finalCard = _chat.chosenRedCard >= 2 ? 'redCard' : 'blueCard';
            const otherTeamCard = _chat.otherTeamFinalCard;
            let myPoints = -1;
            let othersPoints = -1;

            if (finalCard === 'redCard' && otherTeamCard === 'redCard') {
                myPoints = 0;
                othersPoints = 0;
            } else if (finalCard === 'redCard' && otherTeamCard === 'blueCard') {
                myPoints = 100;
                othersPoints = 0;
            } else if (finalCard === 'blueCard' && otherTeamCard === 'redCard') {
                myPoints = 0;
                othersPoints = 100;
            } else if (finalCard === 'blueCard' && otherTeamCard === 'blueCard') {
                myPoints = 50;
                othersPoints = 50;
            }

            chatRef.update({
                teamPoints: myPoints,
                finalCard: finalCard
            })

            resultHandler(finalCard, otherTeamCard, myPoints, othersPoints)

            history.push('/result')
        }

        _chat.messages.forEach(_message => { 
            const messageElement = document.createElement('div');
            const rowElement = document.createElement('div');
            const colElement = document.createElement('div');
            const imgElement = document.createElement('img');
            firstMailInCHat = currentUsers.split(':')[0]

            imgElement.src = _message.senderImgURL

            rowElement.className = 'row';
            colElement.className = 'col';

            
            if (_message.sender === 'Admin') {
                const ready = _chat.readyToChoose;
                const notReady = _chat.notReadyToChoose;
                
                if (ready + notReady === 3) {
                    if (ready >= 2) {
                        chatRef.update({
                            teamReady: true
                        })

                        if (email === firstMailInCHat) {
                            askIfReadyHandler();
                        }
                    }

                    chatRef.update({
                        messages: firebase.firestore.FieldValue.arrayRemove(_message)
                    })

                    chatRef.update({
                        readyToChoose: 0,
                        notReadyToChoose: 0
                    })
                }

                messageElement.className = 'adminMessages';
                messageElement.innerText = ` ${_message.message}`;
                const buttonElementYes = document.createElement('button');
                const buttonElementNo = document.createElement('button');

                buttonElementYes.innerText = 'Ja';
                buttonElementNo.innerText = 'Nej';

                console.log(usersVoted.includes(email));

                if (usersVoted.includes(email)) {
                    buttonElementYes.className = 'hide';
                    buttonElementNo.className = 'hide';
                } else {
                    buttonElementYes.className = '';
                    buttonElementNo.className = '';
                }

                buttonElementYes.addEventListener("click", () => {
                    buttonElementYes.className = 'hide';
                    buttonElementNo.className = 'hide';

                    chatRef.update({
                        readyToChoose: _chat.readyToChoose + 1,
                        usersVoted: firebase.firestore.FieldValue.arrayUnion(email)
                    })
                });

                buttonElementNo.addEventListener("click", () => {
                    buttonElementYes.className = 'hide';
                    buttonElementNo.className = 'hide';

                    chatRef.update({
                        notReadyToChoose: _chat.notReadyToChoose + 1,
                        usersVoted: firebase.firestore.FieldValue.arrayUnion(email)
                    })
                });

                messageElement.append(buttonElementYes);
                messageElement.append(buttonElementNo);

                // Låt dessa motsvara hur många readyToAnswer i databsen
                // När minst två är gröna så ska välj-kort-rutan visas

                for (let i = 0; i < ready; i++) {
                    messageElement.append('✔️');
                }

                for (let i = 0; i < notReady; i++) {
                    messageElement.append('❌');
                }
                
                colElement.append(messageElement);
                rowElement.append(colElement);
            } else if (_message.sender === name) { // the users own messges
                const messageContainer = document.createElement('div');
                const nameTimeContainer =  document.createElement('div');
                
                nameTimeContainer.innerText =  `${_message.timestamp} ${_message.sender}` 
                messageElement.innerText = ` ${_message.message}`;
                messageContainer.append(nameTimeContainer)
                messageContainer.append(messageElement);
                messageContainer.append(imgElement);

                messageContainer.className = 'myMessagesBox'
                messageElement.className = 'myMessages';
                nameTimeContainer.className = 'nameTimeTag';
                colElement.append(messageContainer)
                rowElement.append(colElement)
            } else { // messages from other people in chat 1
                const messageContainer = document.createElement('div');
                const nameTimeContainer =  document.createElement('div');

                nameTimeContainer.innerText = `${_message.timestamp} ${_message.sender}`; 
                messageElement.innerText = ` ${_message.message}`;

                messageContainer.append(nameTimeContainer);
                messageContainer.append(imgElement);

                messageContainer.append(messageElement);
                

                messageContainer.className = 'otherMessagesBox'
                messageElement.className = 'otherMessages';
                nameTimeContainer.className = 'nameTimeTag';
                colElement.append(messageContainer)
                rowElement.append(colElement)
                
            }     

            document.getElementById('chatMessages').append(rowElement);
        })

        const objDiv = document.getElementById("chatMessages");
        objDiv.scrollTop = objDiv.scrollHeight;  
    })

    function submitMessage(event) {
        event.preventDefault();
        const newMessage = document.getElementById('msg-box').value;
        
        const d = new Date();
        const minuteStamp = d.getMinutes();
        const hourStamp = d.getHours();
        const strMinuteStamp = minuteStamp < 10 ? `0${minuteStamp}` : `${minuteStamp}`;
        const strHourStamp = hourStamp < 10 ? `0${hourStamp}` : `${hourStamp}`;

        firebase
            .firestore()
            .collection('chats')
            .doc(currentUsers)
            .update({
                messages: firebase.firestore.FieldValue.arrayUnion({
                    sender: name,
                    message: newMessage,
                    timestamp: `${strHourStamp}:${strMinuteStamp}`,
                    senderImgURL: imgURL
                })
            })

        document.getElementById('msg-box').value = '';
        document.getElementById("msg-box").focus();
    }
    // --------------------

    const chooseRedCard = () => {
        document.getElementById('redCardChooser').className = 'hide';
        document.getElementById('blueCardChooser').className = 'hide';
        const dbRef = firebase.firestore().collection('chats').doc(currentUsers)
        let increment = firebase.firestore.FieldValue.increment(1);
        
        dbRef.update({
            chosenRedCard: increment
        })
    }

    const chooseBlueCard = () => {
        document.getElementById('redCardChooser').className = 'hide';
        document.getElementById('blueCardChooser').className = 'hide';
        
        const dbRef = firebase.firestore().collection('chats').doc(currentUsers)
        let increment = firebase.firestore.FieldValue.increment(1);
        
        dbRef.update({
            chosenBlueCard: increment
        })
    }

    /* POP UP CONTENT: */
    let popupcontent = (
        <div className="popContent">  
            <div id="header"> SPELGRELER </div>
            {reglerLong}
        </div>
    );

    // ---

    var image = "https://img.freepik.com/free-vector/businessman-profile-cartoon_18591-58479.jpg?size=338&ext=jpg";
    
    let timerContent = null;

    if (email === firstMailInCHat && askIfReady) {
        timerContent = (
            <TimerReady currentUsers={currentUsers} />
        )
    }

    let voteBoxContent = null;

    if (teamReady) {
        voteBoxContent = (
            <div id='voteBox'>
                <Row>
                    <Col>
                        <h5>VÄLJ KORT HÄR</h5> 
                        
                        Se till att vara överrens i gruppen innan valet görs.
                        Ni väljer kort som ett lag.
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <div className="inline-block" id='redCardChooser'>
                            <div onClick={chooseRedCard}>
                                <img src={require('../red_card.png')}/>
                                <h6 className="inline-block">RÖTT KORT</h6>
                            </div>
                        </div>

                        <div className="inline-block" id='blueCardChooser'>
                            <div onClick={chooseBlueCard}>
                                <img src={require('../blue_card.png')}/>
                                <h6 className="inline-block">BLÅTT KORT</h6>
                            </div>
                        </div>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <p className='choicesText'>Era val: </p>
                        <div id='chosenCardContainer'>

                        </div>
                    </Col>
                </Row>
            </div>
        )
    }

    return (
        <Container className="chatContainer" fluid>
            {/* HEADER   lägg till fluid={true} här uppe om chatterna ska fylla hela skärmen */}
            <Row>
                <Col>
                    <img src={require('../headerImage.png')}  alt="THE CARD GAME" id="headerimg"></img>
                </Col>
            </Row> 
            <Row>

                <Col>
                    <div id="text">
                        {reglerShort}
                    </div>  
                </Col>
            </Row>


            <Row > {/* ROW FOR THE CHAT WINDOWS */}
                <Col sm={12} lg={6} >  {/* ACTIVE CHAT */}
                    <div className="chatBox">
                        <Row>
                            <Col md={4}>      
                                <div id="userinfo">
                                    <b>Inloggad som:</b><br/> 
                                    <img src={image} alt="" /> {name}
                                </div>  
                            </Col>

                            <Col md={8}>
                                <div id="userinfo">
                                    <b>Lagmedlemmar</b><br/> 
                                    <img src={"https://www.positivelysplendid.com/wp-content/uploads/2013/09/Circle-Crop-Profile-300x300.png"} alt="" /> Emma Bobsson
                                    <img src={"https://images.squarespace-cdn.com/content/v1/5589a812e4b0248058743f7e/1562001389112-WFLCO7JEU2GDDM9ANYXT/ke17ZwdGBToddI8pDm48kMh3mVmBaCAeGwqCLG3iONRZw-zPPgdn4jUwVcJE1ZvWQUxwkmyExglNqGp0IvTJZamWLI2zvYWH8K3-s_4yszcp2ryTI0HqTOaaUohrI8PITeQtWPcxF65ANawkK25DREOmFck9peR6QL8AnpRiPJE/LAURA+PROFILE+CIRCLE+NEW.png"} alt="" /> Mary Major
                                </div>
                            </Col>
                        </Row>

                        <Row>
                            <Col>
                                {timerContent}

                                <div id="chatMessages">
                                    
                                </div>
                            </Col>
                        </Row>

                        <Row>
                            <Col xs={12}>    
                                <div id="submitRow">
                                    <Form onSubmit={submitMessage}>
                                        <Row>
                                            <Col>    
                                                <Form.Row >
                                                    <Form.Control 
                                                        bsPrefix="send_text" 
                                                        type="text" 
                                                        id="msg-box" 
                                                        autoFocus 
                                                    />
                                                    
                                                    <Button  
                                                        bsPrefix="send_button" 
                                                        type="submit" 
                                                    >
                                                            SKICKA
                                                    </Button>
                                                </Form.Row>
                                            </Col>
                                        </Row>
                                        
                                    </Form>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Col>

                <Col sm={12} lg={6}> {/* 2ND CHAT */}
                    <OtherTeamView />

                    {voteBoxContent}
                </Col>
            </Row>

            <Row>
                <Col>    
                    <div id="logout">
                        {/* POP-UP WINDOW FÖR SPELREGLER */}

                        <Popup trigger={<u>Spelregler</u>} modal>
                            {popupcontent}
                        </Popup>

                    <Link to="/thecardgame">Log out</Link></div>
                </Col>
            </Row>
        </Container>
    );
  }

export default ChatView;

