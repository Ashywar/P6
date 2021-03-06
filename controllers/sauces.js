const Sauce = require('../models/Sauce'); // importe le schema Sauce
const fs = require('fs'); //permet de modifier le système de fichiers


//Creation sauce
exports.createSauce = (req, res, next) => { // route et le middleware
    const sauceObject = JSON.parse(req.body.sauce);
    delete sauceObject._id; // Suppression en amont du faux_id envoyé par le front-end
    const sauce = new Sauce({ // Instance (new) du modèle Sauce en passant un objet JavaScript contenant toutes les informations requises du corps de requête analysé
        ...sauceObject, // Opérateur spread ... utilisé pour faire une copie de tous les éléments de req.body
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
        likes: 0, // initialiser à zéro
        dislikes: 0
    });
    sauce.save() // enregistrer objet Sauce dans la base de données
        .then(() => res.status(201).json({
            message: 'Objet enregistré !'
        })) // Renvoie une promesse (réussie)
        .catch(error => res.status(400).json({
            error
        }));
};

//Modification sauce
exports.updateSauce = (req, res, next) => {
    const sauceObject = req.file ? {
        ...JSON.parse(req.body.sauce),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}` // S'il existe on traite l'image
    } : {
        ...req.body
    };
    if (req.file) { // Si un nouveau fichier est affecté alors tu rentres dans le code ci-dessous
        Sauce.findOne({
                _id: req.params.id
            }) // on recupere le sauce concerné (ce qui nous retourne une promesse)
            .then(sauce => { // on lui dit que dans ce sauce il va appliquer le code suivant
                const filename = sauce.imageUrl.split('images/')[1]; // on va chercher l'ancienne image et on la met dans un variable 'filename'
                fs.unlink(`images/${filename}`, (error => {
                    if (error) console.log(error)
                })) // on lui dit de unlink (supprimer) l'image selectionnée plus haut dans la variable filename
            })
            .catch(error => res.status(500).json({
                error
            }));
    }
    Sauce.updateOne({
            _id: req.params.id
        }, {
            ...sauceObject,
            _id: req.params.id
        })
        .then(() => res.status(200).json({
            message: 'Objet modifié !'
        }))
        .catch(error => res.status(400).json({
            error
        }));
};

//Suppresion sauce
exports.deleteSauce = (req, res, next) => {
    Sauce.findOne({
            _id: req.params.id
        })
        .then(sauce => {
            const filename = sauce.imageUrl.split('/images/')[1];
            fs.unlink(`images/${filename}`, () => {
                Sauce.deleteOne({
                        _id: req.params.id
                    })
                    .then(() => res.status(200).json({
                        message: 'Objet supprimé !'
                    }))
                    .catch(error => res.status(400).json({
                        error
                    }));
            });
        })
        .catch(error => res.status(500).json({
            error
        }));
};

//Renvoie toutes les sauces
exports.getSauces = (req, res, next) => {
    Sauce.find() // méthode find() du modèle Mongoose afin de renvoyer un tableau contenant tous les sauces de la base de données
        .then(sauces => res.status(200).json(sauces))
        .catch(error => res.status(400).json({
            error
        }));
};

//Renvoie une sauce
exports.getSauceById = (req, res, next) => { //deux-points : en face du segment dynamique de la route pour la rendre accessible en tant que paramètre
    Sauce.findOne({
            _id: req.params.id
        }) //méthode findOne() du modèle sauce pour trouver le sauce unique ayant le même _id que le paramètre de la requête
        .then(sauce => res.status(200).json(sauce)) // sauce retourné dans une Promise et envoyé au front-end
        .catch(error => res.status(404).json({
            error
        }));
};


//Création des likes, dislikes et modification
exports.likeDislikeSauces = (req, res) => {
    Sauce.findOne({
            _id: req.params.id
        })
        .then((sauce) => {
            const userId = req.body.userId;
            const userWantsToLike = req.body.like == 1;
            const userWantsToDislike = req.body.like == -1;
            const userWantsToClear = req.body.like == 0;

            if (userWantsToDislike) {
                sauce.usersDisliked.push(userId);
            }
            if (userWantsToLike) {
                sauce.usersLiked.push(userId);
            }
            if (userWantsToClear) {
                if (sauce.usersLiked.includes(userId)) {
                    const index = sauce.usersLiked.indexOf(userId);
                    sauce.usersLiked.splice(index, 1);
                }
                if (sauce.usersDisliked.includes(userId)) {
                    const index = sauce.usersDisliked.indexOf(userId);
                    sauce.usersDisliked.splice(index, 1);
                }
            }
            sauce.likes = sauce.usersLiked.length;
            sauce.dislikes = sauce.usersDisliked.length;
            sauce.save();
            return sauce;
        })
        .then((sauce) => res.status(200).json(sauce))
        .catch((error) => {
            res.status(500).json({
                error
            });
        });
};